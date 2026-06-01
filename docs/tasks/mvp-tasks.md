# MVPフェーズ 実装タスクリスト

> プロトタイプ版（2026年10月リリース予定）の実装チェックリスト。  
> 機能ID単位で管理。完了したら `[x]` に変更する。

---

## 凡例

- `[ ]` 未着手
- `[~]` 作業中
- `[x]` 完了
- 🔴 ブロッカー（これが終わらないと次が進まない）
- 🟡 並行可能
- 🟢 後回し可（コア動作に影響なし）

---

## Phase 0: 環境構築・基盤

### リポジトリ・モノレポ設定

- [x] 🔴 pnpm workspaces + Turborepo の初期セットアップ
- [x] 🔴 `packages/types` の作成（共有型定義の骨格）
- [x] 🔴 `packages/eslint-config` の作成
- [x] 🔴 `packages/tsconfig` の作成（strict: true）
- [x] 🔴 `turbo.json` のタスクグラフ定義（build/lint/test）

### CI/CD

- [x] 🟡 `.github/workflows/ci.yml` — lint + type-check + test（PR時）
- [x] 🟡 `.github/workflows/deploy-web.yml` — Vercel自動デプロイ（release merge時）
- [x] 🟡 `.github/workflows/deploy-api.yml` — Render自動デプロイ（release merge時）

### インフラ（Supabase）

- [x] 🔴 Supabaseプロジェクト作成
- [x] 🔴 `infra/supabase/migrations/` 初期スキーマ作成（users, groups, group_members, tasks, task_completions, goals, rewards）
- [x] 🔴 RLSポリシーの設定（family_group_id による分離）
- [x] 🟡 `infra/supabase/seed/` 開発用シードデータ（親子ユーザー・サンプルタスク）
- [x] 🟡 JWTカスタムクレーム用のDatabase Hook（role / family_group_id）

---

## Phase 1: 認証・ユーザー管理

### バックエンド（NestJS）

- [x] 🔴 `apps/api/src/modules/auth/` モジュール作成
- [x] 🔴 FUN-AUTH-001: ユーザー登録API（API-AUTH-001）— ID/パスワード
- [x] 🔴 FUN-AUTH-002: ログインAPI（API-AUTH-002）— Supabase Auth連携
- [x] 🔴 FUN-AUTH-003: ログアウトAPI（API-AUTH-003）
- [x] 🔴 FUN-AUTH-006: プロフィール登録・更新API（API-AUTH-006）— 名前・アイコン・role設定
- [x] 🔴 FUN-AUTH-007: ユーザー削除API（API-AUTH-007）
- [x] 🔴 `JwtAuthGuard` の実装（Supabase JWT検証）
- [x] 🔴 `RolesGuard` の実装（parent / child ロール制御）

### フロントエンド（Next.js）

- [x] 🔴 `apps/web/src/lib/supabase.ts` — browser/serverクライアント設定
- [x] 🔴 SCR-AUTH-001: 会員登録画面（FUN-AUTH-001）
- [x] 🔴 SCR-AUTH-002: ログイン画面（FUN-AUTH-002）
- [x] 🔴 SCR-AUTH-003: プロフィール登録画面（FUN-AUTH-006）
- [x] 🔴 認証状態のミドルウェア（未ログイン時のリダイレクト）

---

## Phase 2: 家族グループ管理

### バックエンド（NestJS）

- [x] 🔴 `apps/api/src/modules/family/` モジュール作成
- [x] 🔴 FUN-GROUP-001: 家族グループ登録API（API-GROUP-001）
- [x] 🔴 FUN-GROUP-002: 家族メンバー一覧API（API-GROUP-002）
- [x] 🔴 FUN-GROUP-003: 家族メンバー詳細API（API-GROUP-003）
- [x] 🔴 FUN-GROUP-004: QRコード招待生成API（API-GROUP-004）
- [x] 🔴 FUN-GROUP-005: QRコードからグループ参加API（API-GROUP-005）
- [x] 🟡 FUN-GROUP-006: グループ脱退API（API-GROUP-006）

### フロントエンド（Next.js）

- [x] 🔴 SCR-GROUP-001: 家族メンバー一覧画面
- [x] 🔴 SCR-GROUP-003: 家族グループ招待画面（QRコード表示）
- [x] 🔴 SCR-GROUP-004: 家族グループ参加画面（QRコードスキャン）
- [x] 🟡 SCR-GROUP-002: 家族メンバー詳細画面
- [x] 🟡 SCR-GROUP-005: 家族グループ脱退画面

---

## Phase 3: タスク管理（コア機能）

### バックエンド（NestJS）

- [x] 🔴 `apps/api/src/modules/tasks/` モジュール作成
- [x] 🔴 FUN-TASK-001: タスク登録API（API-TASK-001）— タイトル・説明・単価・期限・タイプ
- [x] 🔴 FUN-TASK-002: タスク編集API
- [x] 🔴 FUN-TASK-003: タスク削除API（API-TASK-002）
- [x] 🔴 FUN-TASK-004: タスクステータス変更API（API-TASK-003）— 承認・差し戻し・取り下げ
- [x] 🔴 FUN-TASK-006: タスク一覧API（API-TASK-005）
- [x] 🟡 FUN-TASK-005: タスクカレンダーAPI（API-TASK-004）
- [x] 🟡 FUN-TASK-007: タスク検索API（API-TASK-007）
- [x] 🟡 FUN-TASK-008: タスク実行報告API（task_completionsレコード作成・承認・ソフトデリート）
- [x] 🔴 ステータス遷移バリデーション（重複報告禁止・期限切れ自動処理）

### フロントエンド（Next.js）

- [x] 🔴 SCR-TASK-001: タスク一覧画面（親用: 承認ボタン付き / 子用: 報告ボタン付き）
- [x] 🔴 SCR-TASK-002: タスク詳細画面（ステータス表示・アクション・実行報告日時・承認日時表示）
- [x] 🟡 SCR-TASK-005: タスク検索画面
- [x] 🟡 FUN-TASK-008: タスク詳細画面に実行報告日時・承認日時を表示（子ビュー・親ビュー共通）
- [x] 🔴 `components/TaskCard` — タスクカードコンポーネント

---

## Phase 4: 報酬管理

### バックエンド（NestJS）

- [x] 🔴 `apps/api/src/modules/rewards/` モジュール作成
- [x] 🔴 FUN-REWARD-001: 月次報酬集計API（API-REWARD-001）— 端数切り捨て実装
- [x] 🔴 FUN-REWARD-003: 月次評価登録API（API-REWARD-002）
- [x] 🔴 支払い完了API — 累積報酬リセット処理（ADR-0004参照）
- [x] 🟡 FUN-REWARD-004: 報酬グラフ用データAPI（API-REWARD-003）
- [x] 🟡 FUN-REWARD-005: 報酬テーブル用データAPI（API-REWARD-004）

### フロントエンド（Next.js）

- [x] 🔴 SCR-REWARD-001: 報酬管理画面（確定報酬・支払い完了ボタン）
- [ ] 🟡 SCR-REWARD-002: 報酬グラフ確認画面

---

## Phase 5: 目標管理（マンスリーゴール）

### バックエンド（NestJS）

- [x] 🟡 `apps/api/src/modules/goals/` モジュール作成
- [x] 🟡 FUN-GOAL-003: 目標登録API（API-GOAL-003）— 定量/定性・ボーナス金額
- [x] 🟡 FUN-GOAL-001: 目標一覧API（API-GOAL-001）
- [x] 🟡 FUN-GOAL-002: 目標詳細API（API-GOAL-002）
- [x] 🟡 FUN-GOAL-004: 目標削除API（API-GOAL-004）
- [x] 🟡 FUN-GOAL-005: 目標ステータス変更API（API-GOAL-005）— 挑戦宣言・達成判定・承認

### フロントエンド（Next.js）

- [x] 🟡 SCR-GOAL-001: 目標一覧画面（進捗プログレスバー表示）
- [x] 🟡 SCR-GOAL-002: 目標詳細画面（達成率・挑戦ボタン・達成判定）
- [x] 🟡 `components/GoalProgress` — 目標進捗コンポーネント

---

## Phase 6: ダッシュボード・TOP画面

- [ ] 🟡 SCR-TOP-001: メニュー画面（ダッシュボード）
  - 今月のタスク達成数
  - 今月の確定報酬
  - 目標進捗（プログレスバー）
  - 最近の承認待ちタスク

---

## Phase 7: E2Eテスト・品質保証

- [ ] 🟢 主要フローのE2Eテスト（Playwright or Cypress）
  - タスク登録→報告→承認→報酬確定フロー
  - 目標設定→挑戦→達成判定フロー
  - QRコード招待→参加フロー
- [ ] 🟢 NestJSモジュールのUnit Test（Jest）
- [ ] 🟢 Storybookでコンポーネントカタログ作成

---

## 完了条件（Definition of Done）

MVPリリース条件:

- [ ] ユーザー登録〜タスク報告〜承認〜報酬確認の一連フローが動作する
- [ ] 家族グループのQRコード招待が動作する
- [ ] 親・子のロール制御が正しく機能する
- [ ] Vercel / Render へのデプロイが自動化されている
- [ ] モバイル（スマートフォン）で主要画面が正常に表示される
