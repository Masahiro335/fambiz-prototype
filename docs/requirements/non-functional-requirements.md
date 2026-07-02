# 非機能要件定義書

| 項目 | 値 |
|------|-----|
| システムID・名 | FAM_BIZ / FamBiz |
| サブシステムID・名 | FB001 / 家事手伝い |
| 作成日 | 2025-12-01 |
| 最終更新日 | 2026-05-24 |

---

## 1. 性能要件

| 要件 | 目標値 | 備考 |
|------|--------|------|
| 平均レスポンスタイム | 1秒以内 | 通常時 |
| 最大レスポンスタイム | 3秒以内 | ピーク時含む |
| 同時接続ユーザー数 | 1,000人 | — |
| スループット | 200リクエスト/秒 | — |
| バッチ処理時間 | 2時間以内 | 夜間バッチ（月次集計等） |

---

## 2. 可用性要件

| 要件 | 目標値 | 備考 |
|------|--------|------|
| 稼働率 | 99.9%以上 | 年間ダウンタイム ≦ 8.7時間 |
| 計画停止時間 | 月2時間以内 | メンテナンスウィンドウ |
| 冗長構成 | マルチAZ構成（本番）/ シングル（プロト） | AWS本番 or Supabase内蔵冗長 |
| RTO（復旧時間目標） | 2時間以内 | 障害検知から復旧完了まで |
| RPO（復旧時点目標） | 15分以内 | データ損失の許容範囲 |

---

## 3. セキュリティ要件

| 要件 | 内容 |
|------|------|
| 認証方式 | プロトタイプ: ID/パスワード（Supabase Auth）。本番: Google OAuth 2.0（SSO）追加 |
| 通信暗号化 | HTTPS（TLS 1.2以上）を強制。HTTP接続はリダイレクト |
| パスワードポリシー | 12文字以上、英数字含む（本番用） |
| アカウントロック | 3回連続失敗でロック（本番用） |
| 脆弱性対策 | XSS / SQLインジェクション / CSRF対策を実施 |
| ログ管理 | アクセスログ・操作ログ・エラーログを保存（保存期間: 6ヶ月） |
| 機密情報管理 | DBパスワード等はSecrets Manager（本番）またはVercel/Render環境変数で管理。コードへのハードコード禁止 |
| WAF | SQLインジェクション等のサイバー攻撃を遮断（AWS WAF、本番用） |
| 子どものプライバシー | 家庭内のデータは家族グループ内でのみアクセス可能。他家族への情報漏洩を防ぐRLS（Row Level Security）を実施 |

---

## 4. 運用・監視要件

| 要件 | 内容 |
|------|------|
| ログ出力 | CloudWatch Logs（本番）またはRenderログ（プロト）に集約 |
| 監視対象 | CPU / メモリ / ディスク / APIエラー率 |
| アラート条件 | CPU 80%以上、APIエラー率 5%以上で通知 |
| バックアップ | Supabase/RDSの自動バックアップ（1日1回） |
| リストア手順 | スナップショットから復元 |
| デプロイ | CI/CD（GitHub Actions + Vercel/Render自動デプロイ） |

---

## 4-1. CI/CDパイプライン詳細

### ワークフロー一覧

| ファイル | トリガー | 用途 |
|---------|---------|------|
| `.github/workflows/ci.yml` | `feature/**` / `fix/**` / `develop` へのプッシュ、`develop` / `main` へのPR | lint・型チェック・テストの自動実行 |
| `.github/workflows/deploy-web.yml` | `release` ブランチへのプッシュ | Next.js を Vercel 本番環境へデプロイ |
| `.github/workflows/deploy-api.yml` | `release` ブランチへのプッシュ | NestJS を Render 本番環境へデプロイ |
| `.github/workflows/supabase-keep-alive.yml` | 毎週月・木 9:00 UTC（cron）、手動 | Supabase 無料プランの自動停止（7日間非アクティブ）を防ぐ定期 ping |

### ci.yml — CIパイプライン

```
プッシュ / PR
    │
    ├──[並列]── Lint        (ESLint / 全パッケージ)
    ├──[並列]── Type Check  (pnpm build / TypeScript コンパイル)
    └──[並列]── Unit Test   (Jest / 全パッケージ・カバレッジ出力)
                    │
                    └──▶ all-checks-passed（ブランチ保護ルールのステータスチェック）
```

| 設定項目 | 内容 |
|---------|------|
| 並行実行制御 | 同ブランチへの連続プッシュ時、古いジョブを自動キャンセル（`cancel-in-progress: true`） |
| キャッシュ | pnpm store + Turborepo（`.turbo/`）をジョブごとにキャッシュ |
| カバレッジ | `apps/api/coverage/` と `apps/web/coverage/` をArtifactとして7日間保存 |
| ブランチ保護 | `all-checks-passed` ジョブを必須ステータスチェックに設定することでマージをブロック |

### deploy-web.yml — Vercel デプロイパイプライン

```
release ブランチへのプッシュ
    │
    ▼
pre-deploy-check（lint + build + test を直列実行）
    │ 成功時のみ
    ▼
vercel pull（本番環境変数を取得）
    │
    ▼
vercel build --prod（Vercel のビルドパイプラインで Next.js をビルド）
    │
    ▼
vercel deploy --prebuilt --prod（ビルド済みアーティファクトをデプロイ）
    │
    ▼
コミットコメントにデプロイ URL を自動投稿
```

| 設定項目 | 内容 |
|---------|------|
| 並行実行制御 | 同時デプロイを防ぐためキューイング（`cancel-in-progress: false`） |
| デプロイ保護 | `pre-deploy-check` が成功しない限りデプロイジョブは実行されない |
| 環境 | GitHub Environments の `production` を使用（承認フロー設定が可能） |

必要なシークレット:

| シークレット名 | 取得元 |
|---|---|
| `VERCEL_TOKEN` | Vercel › Settings › Tokens で発行 |
| `VERCEL_ORG_ID` | `vercel link` 後の `.vercel/project.json` に記載 |
| `VERCEL_PROJECT_ID` | 同上 |

### deploy-api.yml — Render デプロイパイプライン

```
release ブランチへのプッシュ
    │
    ▼
pre-deploy-check（lint + build + test を直列実行）
    │ 成功時のみ
    ▼
Render デプロイフックを POST（curl）
    │
    ▼
Render API をポーリング（30秒間隔 × 最大20回 = 最大10分）
    │ status が "live" になったら成功
    ▼
コミットコメントにデプロイ結果を自動投稿
```

| 設定項目 | 内容 |
|---------|------|
| 並行実行制御 | 同時デプロイを防ぐためキューイング（`cancel-in-progress: false`） |
| デプロイ完了確認 | Render API で `deploy.status === "live"` を確認してからジョブを完了とみなす |
| タイムアウト | 10分（30秒 × 20回）でポーリングを打ち切りエラー終了 |

必要なシークレット:

| シークレット名 | 取得元 |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render › Service › Settings › Deploy Hook で発行 |
| `RENDER_API_KEY` | Render › Account Settings › API Keys で発行 |
| `RENDER_SERVICE_ID` | Render サービスの ID（`srv-xxxxxxxxxx` 形式） |

### supabase-keep-alive.yml — Supabase 自動停止防止

**背景:** Supabase 無料プランは 7日間 DB アクセスがないとプロジェクトを自動停止する。停止中に Vercel Middleware が Supabase Auth へ接続を試みると応答待ちのままタイムアウト（504 MIDDLEWARE_INVOCATION_TIMEOUT）が発生する。

**仕組み:** Supabase REST API（`/rest/v1/users?select=id&limit=1`）に週2回 GET リクエストを送ることで DB 接続を発生させ、7日間非アクティブカウンターをリセットする。RLS により結果は空配列になるが、DB への接続自体が「アクティビティ」としてカウントされる。

| 設定項目 | 内容 |
|---------|------|
| スケジュール | 毎週月・木 9:00 UTC（`0 9 * * 1,4`）|
| 手動実行 | `workflow_dispatch` で GitHub Actions UI から即時実行可能 |
| 認証 | `SUPABASE_ANON_KEY` シークレットを `apikey` / `Authorization` ヘッダーに使用 |
| 成功条件 | HTTP 200 を受信（DB が稼働中であること） |

必要なシークレット:

| シークレット名 | 取得元 |
|---|---|
| `SUPABASE_ANON_KEY` | Supabase Dashboard › Settings › API › Project API keys › **anon public** |

### GitHub リポジトリの推奨設定

ブランチ保護ルール（`develop` ブランチ）に以下を設定することを推奨する。

| 設定 | 値 |
|-----|---|
| Require status checks to pass before merging | ✅ 有効 |
| 必須ステータスチェック | `all-checks-passed` |
| Require branches to be up to date | ✅ 有効 |
| Restrict who can push to matching branches | ✅ 有効（直接プッシュ禁止） |

---

## 5. 拡張性・スケーラビリティ要件

| 要件 | 内容 |
|------|------|
| スケール方法 | 水平スケーリング（Auto Scaling）。ボトルネック箇所のみスケール可能 |
| 最大ユーザー数想定 | 10,000人 |
| マイクロサービス対応 | 本番ではドメイン単位（家事/勉強/部活）でサービス分割可能な構成 |
| 機能拡張 | 第2次以降（勉強・部活・報酬分析）の拡張を考慮した設計 |

---

## 6. 環境要件

| 要件 | 内容 |
|------|------|
| 対応ブラウザ | Chrome / Safari / Edge（最新2バージョン） |
| 対応OS | iOS / Android / Windows / macOS |
| インフラ（プロトタイプ） | Vercel（フロント）/ Render（バックエンド）/ Supabase（DB・Auth） |
| インフラ（本番） | AWS（ECS + ALB + RDS + S3 + SQS + SES + WAF + CloudWatch） |

### プロトタイプインフラ構成

```
[ユーザー] → Vercel（Next.js） → Render（NestJS API） → Supabase（PostgreSQL + Auth）
```

### 本番インフラ構成（将来）

```
[ユーザー] → Route 53 → ALB → ECS（NestJS マイクロサービス群）
                                    ↓                ↓
                              Amazon RDS        Amazon S3
                              （PostgreSQL）     （画像・ファイル）
                                    ↓
                              SQS → 通知ワーカー → SES/SNS
```

---

## 7. ユーザビリティ要件

| 要件 | 内容 |
|------|------|
| UI/UX基準 | 直感的に操作可能。子ども（小学生〜中学生）でも迷わず使えるデザイン |
| レスポンスフィードバック | ローディングスピナー・スケルトンUIを表示 |
| エラー表示 | ユーザーに分かりやすいメッセージを表示。技術的な詳細はログにのみ出力 |
| モバイル対応 | レスポンシブデザイン必須。スマートフォンでの操作を主体に設計 |

---

## 8. 法的・規約要件

| 要件 | 内容 |
|------|------|
| 個人情報保護 | プライバシーポリシーに準拠。子どもの個人情報の取り扱いに特に注意 |
| ログ保存期間 | 6ヶ月 |
| 利用規約 | 整備済み（サービス公開前に掲載） |
