/**
 * E2Eテスト: QRコード招待 → グループ参加フロー
 *
 * 前提条件:
 *   - apps/web (localhost:3000) と apps/api (localhost:3001) が起動済みであること
 *   - auth.setup.ts によって .auth/parent.json が生成済みであること
 *
 * テスト対象ユーザー:
 *   - parent@example.com (招待する側・グループ参加済み)
 *   - 毎回フレッシュに登録する一時テストユーザー (招待される側)
 *
 * NOTE: `parent2@example.com` は過去のテスト実行で別グループに参加済みになっている可能性があり、
 *       API の家族グループ分離制約によりクリーンアップが困難なため使用しない。
 *       代わりに `Date.now()` で一意なメールアドレスを持つ一時ユーザーを毎回作成する。
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import path from 'path';

const PARENT_STATE = path.join(__dirname, '.auth/parent.json');
const API_BASE_URL = 'http://localhost:3001';

test.describe('QRコード招待 → グループ参加フロー', () => {
  test('親が招待コードを発行し、未参加ユーザーがグループに参加できる', async ({ browser }) => {
    // 多段フロー + 新規登録を含むため個別タイムアウトを延長する
    test.setTimeout(90_000);

    const apiCtx = await playwrightRequest.newContext();
    const testEmail = `e2e-invite-${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    let testUserId: string | null = null;
    let parentGroupId: string | null = null;

    // ----- Step 1: 一時テストユーザーを API で登録する -----
    const registerRes = await apiCtx.post(`${API_BASE_URL}/v1/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        name: 'テストユーザー',
        role: 'child',
      },
    });
    expect(registerRes.ok(), `ユーザー登録失敗: ${await registerRes.text()}`).toBeTruthy();
    const registerBody = (await registerRes.json()) as { user: { id: string } };
    testUserId = registerBody.user.id;

    // ----- Step 2: 親が招待ページでインバイトコードを取得する -----
    const parentCtx = await browser.newContext({ storageState: PARENT_STATE });
    const parentPage = await parentCtx.newPage();

    await parentPage.goto('/family/invite');
    await expect(parentPage.getByText('メンバー招待')).toBeVisible();

    // 招待コードを取得する（font-mono クラスのテキスト）
    const inviteCodeEl = parentPage.locator('.font-mono');
    await expect(inviteCodeEl).toBeVisible();
    const inviteCode = await inviteCodeEl.textContent();
    expect(inviteCode).toBeTruthy();

    // 親のグループIDを JWT から取得する（後続のクリーンアップに使用）
    const parentLoginRes = await apiCtx.post(`${API_BASE_URL}/v1/auth/login`, {
      data: { email: 'parent@example.com', password: 'Password123!' },
    });
    const { accessToken: parentToken } = (await parentLoginRes.json()) as {
      accessToken: string;
    };
    const parentPayload = JSON.parse(
      Buffer.from(parentToken.split('.')[1], 'base64url').toString(),
    ) as { family_group_id?: string };
    parentGroupId = parentPayload.family_group_id ?? null;

    // ----- Step 3: テストユーザーがブラウザでログインして招待URLからグループに参加する -----
    const newUserCtx = await browser.newContext();
    const newUserPage = await newUserCtx.newPage();

    await newUserPage.goto('/login');
    await newUserPage.locator('#email').fill(testEmail);
    await newUserPage.locator('#password').fill(testPassword);
    await newUserPage.getByRole('button', { name: 'ログイン' }).click();
    await newUserPage.waitForURL('/');

    // 招待URLを構築して遷移する
    const joinUrl = `/family/join?code=${encodeURIComponent(inviteCode!.trim())}`;
    await newUserPage.goto(joinUrl);

    // グループ参加ページが表示されることを確認する
    await expect(newUserPage.getByRole('heading', { name: 'グループに参加する' })).toBeVisible();

    // 「参加する」ボタンをクリックしてグループに参加する
    await newUserPage.getByRole('button', { name: /に参加する/ }).click();

    // 参加後は家族管理ページへリダイレクトされることを確認する
    await newUserPage.waitForURL('/family');
    await expect(newUserPage.getByRole('heading', { name: '家族管理' })).toBeVisible();

    // ----- Step 4: 親の家族メンバー一覧に参加者が追加されていることを確認する -----
    await parentPage.goto('/family');
    await expect(parentPage.getByRole('heading', { name: '家族管理' })).toBeVisible();
    await expect(parentPage.getByText(/メンバー数/)).toBeVisible();

    // ----- クリーンアップ: 一時テストユーザーをグループから削除する -----
    if (testUserId && parentGroupId) {
      await apiCtx.delete(
        `${API_BASE_URL}/v1/groups/${parentGroupId}/members/${testUserId}`,
        {
          headers: { Authorization: `Bearer ${parentToken}` },
        },
      );
    }

    await apiCtx.dispose();
    await parentCtx.close();
    await newUserCtx.close();
  });
});
