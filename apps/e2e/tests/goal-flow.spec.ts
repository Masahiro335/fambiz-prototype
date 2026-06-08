/**
 * E2Eテスト: 目標設定 → 挑戦宣言 → 達成報告 → 達成承認フロー
 *
 * 前提条件:
 *   - apps/web (localhost:3000) と apps/api (localhost:3001) が起動済みであること
 *   - auth.setup.ts によって .auth/parent.json, .auth/child.json が生成済みであること
 *   - シードデータのテストアカウントが有効であること
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const PARENT_STATE = path.join(__dirname, '.auth/parent.json');
const CHILD_STATE = path.join(__dirname, '.auth/child.json');

// 各テスト実行で一意な目標名を生成する
const GOAL_NAME = `E2E目標_${Date.now()}`;
const BONUS_REWARD = '300';

// JST の当月を YYYY-MM 形式で返す
function getCurrentMonthJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

test('目標設定 → 挑戦宣言 → 達成報告 → 達成承認フロー', async ({ browser }) => {
  // 多段フローのため個別タイムアウトを延長する
  test.setTimeout(90_000);

  const currentMonth = getCurrentMonthJst();

  // ----- Step 1: 親が目標を登録する -----
  const parentCtx = await browser.newContext({ storageState: PARENT_STATE });
  const parentPage = await parentCtx.newPage();

  await parentPage.goto('/goals/new');
  await expect(parentPage.locator('#goalName')).toBeVisible();

  await parentPage.locator('#goalName').fill(GOAL_NAME);

  // 担当者を「太郎」に設定（seed data の child@example.com）
  await parentPage.locator('#assigneeId').selectOption({ label: '太郎' });

  // 対象月を当月に設定する
  await parentPage.locator('#targetMonth').fill(currentMonth);

  await parentPage.locator('#goalReward').fill(BONUS_REWARD);

  await parentPage.getByRole('button', { name: '登録する' }).click();
  await parentPage.waitForURL('/goals');

  // 目標一覧で登録した目標が表示されていることを確認する
  await expect(parentPage.getByRole('link', { name: GOAL_NAME })).toBeVisible();

  // ----- Step 2: 子が目標を見つけて「挑戦する」 -----
  const childCtx = await browser.newContext({ storageState: CHILD_STATE });
  const childPage = await childCtx.newPage();

  await childPage.goto('/goals');
  await expect(childPage.getByRole('link', { name: GOAL_NAME })).toBeVisible();

  // 目標リンクをクリックして目標詳細ページへ遷移する
  await childPage.getByRole('link', { name: GOAL_NAME }).click();
  // URLが /goals/<uuid> になるまで待機する（一覧ページに残っていないことを保証）
  await childPage.waitForURL(/\/goals\/[0-9a-f-]+$/);
  await expect(childPage.getByRole('heading', { name: '目標詳細' })).toBeVisible();

  // ステータスが「未挑戦」であることを確認する（詳細ページには1件のみ）
  await expect(childPage.getByText('未挑戦')).toBeVisible();

  // 「挑戦する」ボタンをクリックしてステータスを in_progress に変更する
  await childPage.getByRole('button', { name: '挑戦する' }).click();

  // router.refresh() 後にページが更新されて「挑戦中」ステータスになることを確認する
  await expect(childPage.getByText('挑戦中')).toBeVisible();

  // ----- Step 3: 子が「達成報告する」 -----
  await childPage.getByRole('button', { name: '達成報告する' }).click();

  // ページが更新されて「承認待ち」ステータスになることを確認する
  await expect(childPage.getByText('承認待ち')).toBeVisible();

  // ----- Step 4: 親が目標を承認する -----
  await parentPage.goto('/goals');
  await expect(parentPage.getByRole('link', { name: GOAL_NAME })).toBeVisible();

  // 目標リンクをクリックして目標詳細ページへ遷移する
  await parentPage.getByRole('link', { name: GOAL_NAME }).click();
  await parentPage.waitForURL(/\/goals\/[0-9a-f-]+$/);
  await expect(parentPage.getByRole('heading', { name: '目標詳細' })).toBeVisible();

  // ステータスが「承認待ち」であることを確認する
  await expect(parentPage.getByText('承認待ち')).toBeVisible();

  // 「達成承認」ボタンをクリックして目標を達成済にする
  await parentPage.getByRole('button', { name: '達成承認' }).click();

  // ページが更新されて「達成済」ステータスになることを確認する
  await expect(parentPage.getByText('達成済')).toBeVisible();

  await parentCtx.close();
  await childCtx.close();
});
