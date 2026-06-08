/**
 * E2Eテスト: タスク登録 → 報告 → 承認 → 報酬確定フロー
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

// 各テスト実行で一意なタスク名を生成（並行実行や再実行でのデータ衝突を防ぐ）
const TASK_NAME = `E2Eタスク_${Date.now()}`;
const REWARD_AMOUNT = '200';

// JST の当日を YYYY-MM-DD 形式で返す
function getTodayJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

test('タスク登録 → 報告 → 承認 → 報酬確定フロー', async ({ browser }) => {
  // 多段フローのため個別タイムアウトを延長する
  test.setTimeout(90_000);

  const today = getTodayJst();

  // ----- Step 1: 親がタスクを登録する -----
  const parentCtx = await browser.newContext({ storageState: PARENT_STATE });
  const parentPage = await parentCtx.newPage();

  await parentPage.goto('/tasks/new');
  await expect(parentPage.getByText('タスクを登録する')).toBeVisible();

  await parentPage.locator('#taskName').fill(TASK_NAME);

  // 担当者を「太郎（child）」に設定（seed data の child@example.com）
  await parentPage.locator('#assigneeId').selectOption({ label: '太郎（child）' });

  // 開始日時・終了日時（index 0 = start, index 1 = end）
  await parentPage.locator('input[type="date"]').nth(0).fill(today);
  await parentPage.locator('input[type="time"]').nth(0).fill('09:00');
  await parentPage.locator('input[type="date"]').nth(1).fill(today);
  await parentPage.locator('input[type="time"]').nth(1).fill('18:00');

  await parentPage.locator('#rewardAmount').fill(REWARD_AMOUNT);

  await parentPage.getByRole('button', { name: '登録する' }).click();
  // 登録後はタスク一覧へリダイレクトされる
  await parentPage.waitForURL('/tasks');

  // ----- Step 2: 子がタスクを検索して「対応済にする」 -----
  const childCtx = await browser.newContext({ storageState: CHILD_STATE });
  const childPage = await childCtx.newPage();

  await childPage.goto(`/tasks/search?keyword=${encodeURIComponent(TASK_NAME)}`);
  await expect(childPage.getByRole('link', { name: TASK_NAME })).toBeVisible();

  // タスク名リンクをクリックしてタスク詳細ページへ遷移する
  await childPage.getByRole('link', { name: TASK_NAME }).click();
  // URLが /tasks/<uuid> になるまで待機する（検索ページに残っていないことを保証）
  await childPage.waitForURL(/\/tasks\/[0-9a-f-]+$/);
  await expect(childPage.getByRole('heading', { name: 'タスク詳細' })).toBeVisible();

  // 「対応済にする」ボタンをクリックしてタスクを報告する
  await childPage.getByRole('button', { name: '対応済にする' }).click();
  await childPage.waitForURL('/tasks');

  // ----- Step 3: 親がタスクを承認する -----
  await parentPage.goto(`/tasks/search?keyword=${encodeURIComponent(TASK_NAME)}`);
  await expect(parentPage.getByRole('link', { name: TASK_NAME })).toBeVisible();

  await parentPage.getByRole('link', { name: TASK_NAME }).click();
  // 親もタスク詳細ページへ正しく遷移することを保証する
  await parentPage.waitForURL(/\/tasks\/[0-9a-f-]+$/);
  await expect(parentPage.getByRole('heading', { name: 'タスク詳細' })).toBeVisible();

  // ステータスが「対応済」であることを確認してから承認する
  await expect(parentPage.getByText('対応済')).toBeVisible();
  await parentPage.getByRole('button', { name: '承認する' }).click();
  await parentPage.waitForURL('/tasks');

  // ----- Step 4: 報酬管理画面で完了タスクが反映されていることを確認する -----
  await parentPage.goto('/rewards');
  // 報酬管理画面が正常に表示されること
  await expect(parentPage.getByText(/確定報酬|報酬管理/)).toBeVisible();

  await parentCtx.close();
  await childCtx.close();
});
