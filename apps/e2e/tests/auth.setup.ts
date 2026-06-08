import { test as setup, type Page } from '@playwright/test';
import path from 'path';

const authDir = path.join(__dirname, '.auth');

// シードデータのテストアカウント認証情報
const TEST_ACCOUNTS = {
  parent: { email: 'parent@example.com', password: 'Password123!' },
  child: { email: 'child@example.com', password: 'Password123!' },
} as const;

async function loginAndSaveState(
  page: Page,
  email: string,
  password: string,
  stateFile: string,
) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/');
  await page.context().storageState({ path: stateFile });
}

setup('parent の認証状態を保存', async ({ page }) => {
  await loginAndSaveState(
    page,
    TEST_ACCOUNTS.parent.email,
    TEST_ACCOUNTS.parent.password,
    path.join(authDir, 'parent.json'),
  );
});

setup('child の認証状態を保存', async ({ page }) => {
  await loginAndSaveState(
    page,
    TEST_ACCOUNTS.child.email,
    TEST_ACCOUNTS.child.password,
    path.join(authDir, 'child.json'),
  );
});

// parent2 は invite-flow テスト内でフレッシュログインするため storageState 保存は不要
