# FamBiz — 家庭内タスク・お小遣い管理アプリ

> **「働く → 評価される → 報酬を得る」という社会の仕組みを、家庭の中で体験できる。**

子どもが家事タスクをこなすと親が承認し、お小遣いが確定する。月次目標を設定してボーナスを設ける仕組みも持ち、「労働・評価・報酬」の流れを家庭内で完結させる教育支援Webアプリです。

---

## 目次

- [本番環境・デモ](#本番環境デモ)
- [参考資料](#参考資料)
- [背景・課題](#背景課題)
- [機能概要](#機能概要)
- [技術スタック](#技術スタック)
- [システムアーキテクチャ](#システムアーキテクチャ)
- [設計ドキュメント](#設計ドキュメント)
- [主要な技術的判断（ADR）](#主要な技術的判断adr)
- [セキュリティ設計](#セキュリティ設計)
- [開発フロー](#開発フロー)
- [CI/CD](#cicd)
- [ローカル起動](#ローカル起動)
- [ディレクトリ構成](#ディレクトリ構成)

---

## 本番環境・デモ

| | URL |
|---|---|
| **フロントエンド** | https://fambiz-prototype.vercel.app |
| **APIサーバー** | https://fambiz-api.onrender.com |

> Render の無料プランを使用しているため、15分間アクセスがないとAPIがスリープします。初回リクエスト時に起動まで30〜60秒かかる場合があります。

### テストユーザー

| メールアドレス | パスワード | ロール | 名前 |
|---|---|---|---|
| parent@example.com | Password123! | 親 | テスト父 |
| child@example.com | Password123! | 子 | 太郎 |

---

# 参考資料

設計ドキュメント一式をGoogle Driveで公開しています。

📁 [Google Drive — 企画書・要件定義書・設計書](https://drive.google.com/drive/folders/1fVhVV1P3ERlDlQ0-GMgO3qme2BE8NUIN)

| カテゴリ   | ドキュメント                                                                  |
| ---------- | ----------------------------------------------------------------------------- |
| 企画書     | 企画書 / リスクと対策 / 市場分析                                              |
| 要件定義書 | 業務要件定義書 / 機能要件定義書 / 非機能要件定義書                            |
| 設計書     | UIワイヤーフレーム（22画面）/ DBスキーマ（DBML）/ 技術選定定義書 / 画面遷移図 |

## 背景・課題

家庭において「働くこと・お金の仕組み」を子どもに教える機会は少なく、お手伝いへの努力が正当に評価・記録されていないケースが多い。

| 課題                     | FamBiz の解決策                             |
| ------------------------ | ------------------------------------------- |
| 子の努力が可視化されない | タスク実績・承認履歴・報酬グラフとして記録  |
| 親の評価が主観的・不透明 | タスク単価制 + ステータス管理で透明化       |
| お小遣いの根拠が曖昧     | 承認ベースの報酬確定 + 月次支払い完了フロー |
| 教育的動機づけが難しい   | マンスリーゴール + ボーナス制度             |

---

## 機能概要

```
[親] タスク登録（名称・単価・期限）
     ↓
[子] タスク一覧を確認 → 完了報告
     ↓ 承認待ち（重複報告不可）
[親] 承認 → 報酬が確定   /   差し戻し → 再実施可能
     ↓
[親] 月末に「支払い完了」処理 → 累積報酬リセット
```

### 実装対象画面（22画面 / ワイヤーフレーム設計完了）

| ドメイン     | 主な機能                                         |
| ------------ | ------------------------------------------------ |
| 認証         | 会員登録・ログイン・プロフィール登録             |
| 家族グループ | グループ作成・QRコード招待・メンバー管理         |
| タスク管理   | タスクCRUD・ステータス遷移・カレンダー表示・検索 |
| 報酬管理     | 月次集計・推移グラフ・明細テーブル・支払い完了   |
| 目標管理     | マンスリーゴール設定・進捗バー・ボーナス確定     |

### タスクステータス遷移

```
[未対応] ──（子: 完了報告）──▶ [対応済]
                                   │
                    ┌──────────────┴──────────────┐
             （親: 承認）                   （親: 差し戻し）
                    ↓                            ↓
                [完了]                        [未対応]
           （報酬が確定）
```

---

## 技術スタック

| レイヤー       | 技術                                 | 選定理由                                                   |
| -------------- | ------------------------------------ | ---------------------------------------------------------- |
| フロントエンド | **Next.js 14 (App Router)**          | RSCによるSSR/CSR使い分け・Vercel親和性                     |
| バックエンド   | **NestJS**                           | TypeScriptファースト・モジュール強制によるスパゲッティ防止 |
| データベース   | **Supabase (PostgreSQL)**            | RLS・Auth・リアルタイム購読を一括提供                      |
| 認証           | **Supabase Auth + JWT**              | JWTカスタムクレームで role / family_group_id を伝搬        |
| モノレポ       | **Turborepo + pnpm workspaces**      | キャッシュ付きビルド・型定義の一元管理                     |
| 開発環境       | **Dev Container**                    | Node.js・pnpm・Supabase CLIのバージョンをコードで固定      |
| CI/CD          | **GitHub Actions + Vercel + Render** | PRごとにlint/type-check/testを自動実行                     |

### パッケージ構成（モノレポ）

```
packages/
├── types/        ← フロント・バック共有のTypeScript型定義
├── eslint-config ← コーディングスタイルの統一
└── tsconfig      ← strict: true を全パッケージに強制
```

> フロントとバックエンドが `packages/types` を参照するため、API変更時の型不整合をコンパイル時に検出できます。

---

## システムアーキテクチャ

### プロトタイプ構成

```
ブラウザ
   │ HTTPS
   ▼
Vercel (Next.js 14)
   │ REST API (Bearer JWT)
   ▼
Render (NestJS)  ─── JwtAuthGuard + RolesGuard
   │ Supabase SDK
   ▼
Supabase
   ├── PostgreSQL（RLSポリシーで家族グループ分離）
   └── Auth（JWT発行・セッション管理）
```

### 本番想定構成（将来）

```
Route 53 → ALB → ECS (NestJS マイクロサービス群)
                         │               │
                    Amazon RDS       Amazon S3
                   (PostgreSQL)     (画像・ファイル)
                         │
                    SQS → 通知ワーカー → SES / SNS
```

NestJSの各ドメインモジュール（auth / tasks / goals / rewards / family）を疎結合に設計しており、将来のマイクロサービス分割に対応した構成にしています。

---

## 設計ドキュメント

本プロジェクトは**仕様駆動開発**で進めており、実装前にドキュメントを整備しています。

| 種別             | ファイル                                           | 内容                                               |
| ---------------- | -------------------------------------------------- | -------------------------------------------------- |
| 業務要件         | `docs/requirements/business-requirements.md`       | ユースケース・業務フロー・業務ルール               |
| 機能要件         | `docs/requirements/functional-requirements.md`     | 全機能ID（FUN-xxx）・画面一覧（SCR-xxx）           |
| 非機能要件       | `docs/requirements/non-functional-requirements.md` | 性能・可用性・セキュリティ・拡張性                 |
| API仕様          | `docs/design/openapi.yaml`                         | OpenAPI 3.1 準拠のREST API仕様（全エンドポイント） |
| DBスキーマ       | `docs/design/schema.dbml`                          | DBML形式のER図                                     |
| UI仕様           | `docs/design/ui-spec.md`                           | 全22画面のレイアウト仕様                           |
| ワイヤーフレーム | `docs/design/wireframes/`                          | 画面別PNG（全22画面）                              |
| ADR              | `docs/adr/`                                        | 技術的判断の記録（5件）                            |
| 実装タスク       | `docs/tasks/mvp-tasks.md`                          | フェーズ別チェックリスト                           |

---

## 主要な技術的判断（ADR）

設計上のトレードオフをADR（Architecture Decision Records）として記録しています。

### ADR-0001: Turborepo モノレポ採用

**課題:** フロント・バックで型定義を共有しながら、CIを一元管理したい。

**決定:** pnpm workspaces + Turborepo を採用。

**トレードオフ:** polyrepoより初期セットアップコストが高いが、`packages/types` による型安全な通信と、タスクキャッシュによるCI高速化を優先した。

---

### ADR-0002: Next.js App Router + NestJS の組み合わせ

**課題:** SSRとSPAの良いとこどりをしながら、将来のマイクロサービス化にも対応したい。

**決定:**

- フロント: Next.js 14 App Router（データフェッチはRSC・インタラクションはClient Component）
- バック: NestJS（モジュール構成でドメイン境界を明確化）

**トレードオフ:** App Routerはpagesルーターよりキャッシュ戦略が複雑だが、RSCによるウォーターフォール排除とVercel最適化を優先した。

---

### ADR-0003: Supabase Auth + JWT カスタムクレーム

**決定:** JWTのペイロードに `role（parent/child）` と `family_group_id` を含めることで、バックエンドのGuardがユーザー情報を都度DBから取得せずに認可判断できる設計にした。

```typescript
// JWTペイロードの例
{
  "sub": "uuid",
  "role": "parent",
  "family_group_id": "uuid",
  "exp": 1234567890
}
```

---

### ADR-0004: 報酬計算ルール（切り捨て・月次集計）

**課題:** お小遣いは現実の金銭であり、計算ロジックが親子間でトラブルの原因になりうる。

**決定:**

- 端数処理は `Math.floor()` のみ（切り上げ・四捨五入禁止）
- 集計期間は毎月1日〜末日（JST固定）
- 支払いは「親が支払い完了ボタンを押す」明示的アクションで確定

**理由:** 計算の透明性と「払った/もらった」という行為の明確化を優先。自動リセットは「渡し忘れ」を生む。

---

### ADR-0005: Dev Container による環境標準化

**決定:** `.devcontainer/devcontainer.json` でNode.js 20・pnpm・Supabase CLIのバージョンを固定。

**効果:** 「自分の環境でしか動かない」問題を排除。コンテナ起動後に `pnpm dev` だけで開発を開始できる。

---

## セキュリティ設計

### 多層防御（Defense in Depth）

子どものデータを扱うため、3層のセキュリティを実装しています。

```
リクエスト
   │
   ▼
[Layer 1] JwtAuthGuard  ← JWTの署名・有効期限を検証
   │
   ▼
[Layer 2] RolesGuard    ← role（parent/child）に基づく操作権限チェック
   │
   ▼
[Layer 3] Supabase RLS  ← family_group_id による行レベルセキュリティ
   │
   ▼
データ取得
```

### 親専用操作（`@Roles('parent')` 必須）

| エンドポイント             | 操作       |
| -------------------------- | ---------- |
| `POST /tasks`              | タスク登録 |
| `PATCH /tasks/:id/approve` | タスク承認 |
| `POST /goals`              | 目標設定   |
| `POST /rewards`            | 報酬確定   |
| `POST /family/invite`      | 招待QR生成 |

### family_group_id による完全分離

```typescript
// 全クエリに family_group_id フィルタを強制
// 他家族のデータはRLSとアプリ層の二重チェックで遮断
async findAll(familyGroupId: string) {
  return this.supabase
    .from('tasks')
    .select('*')
    .eq('family_group_id', familyGroupId); // 必須
}
```

---

## 開発フロー

### ブランチ戦略

```
main     ← デフォルト（直接プッシュ禁止）
develop  ← PRマージ先（全機能はここへ）
release  ← Vercel/Renderへ自動デプロイ
feature/FUN-xxx ← 機能開発ブランチ
```

### コミットメッセージ規約

```
feat(tasks): FUN-TASK-004 タスクステータス変更APIを実装
fix(auth): JWTクレームの検証ロジックを修正
docs(adr): ADR-0003 Supabase Auth方針を追記
```

### Claude Code カスタムコマンド

開発効率化のため、プロジェクト専用のスラッシュコマンドを定義しています。

| コマンド             | 概要                                     | サブエージェント        |
| -------------------- | ---------------------------------------- | ----------------------- |
| `/implement FUN-xxx` | APIとWebをサブエージェントで**並列実装** | 2本（NestJS / Next.js） |
| `/security-audit`    | 認証認可・RLS・計算精度を**並列監査**    | 3本                     |
| `/openapi-check`     | 実装とopenapi.yamlの整合性を**並列検証** | 最大5本                 |
| `/task-status`       | MVP進捗サマリーと次タスク推薦を表示      | —                       |
| `/gen-migration`     | schema.dbmlからマイグレーションSQLを生成 | 1本                     |

---

## CI/CD

GitHub Actions で3本のワークフローを定義しています（`.github/workflows/`）。

### ワークフロー全体像

```
feature/** / fix/** へ push
PR → develop / main
         │
         ▼
┌─────────────────────────────────┐
│          ci.yml                 │
│                                 │
│  [Lint] ──┐                     │
│           ├──▶ all-checks-passed│  ← ブランチ保護の必須チェック
│  [Build] ─┤   （全ジョブ並列）  │
│           │                     │
│  [Test] ──┘                     │
└─────────────────────────────────┘

develop → release へ push
         │
         ├──▶ deploy-web.yml ──▶ Vercel（本番）
         │
         └──▶ deploy-api.yml ──▶ Render（本番）
```

### ワークフロー詳細

#### `ci.yml` — PR・開発ブランチの品質チェック

| ジョブ | 内容 | 備考 |
| --- | --- | --- |
| Lint | ESLint（全パッケージ） | 並列実行 |
| Type Check | `pnpm build`（TypeScriptコンパイル） | 並列実行 |
| Unit Test | Jest（全パッケージ） + カバレッジ出力 | 並列実行 |
| all-checks-passed | 全ジョブの成否を集約 | ブランチ保護ルールに登録する |

- 同ブランチへの連続プッシュで古いジョブを自動キャンセル（`concurrency`）
- Turborepoキャッシュ（`.turbo/`）により2回目以降の実行を高速化
- カバレッジレポートをArtifactとして7日間保存

#### `deploy-web.yml` — Vercel 本番デプロイ

```
CIチェック（lint + build + test）
    │ 成功時のみ
    ▼
vercel pull → vercel build --prod → vercel deploy --prebuilt --prod
    │
    ▼
コミットコメントにデプロイURLを自動投稿
```

#### `deploy-api.yml` — Render 本番デプロイ

```
CIチェック（lint + build + test）
    │ 成功時のみ
    ▼
Render デプロイフックを POST
    │
    ▼
Render API をポーリング（30秒 × 最大20回）
    │ status === "live" で完了
    ▼
コミットコメントに成否を自動投稿
```

### 必要な GitHub Secrets

| シークレット | 用途 |
| --- | --- |
| `VERCEL_TOKEN` | Vercel API 認証トークン |
| `VERCEL_ORG_ID` | Vercel 組織 ID |
| `VERCEL_PROJECT_ID` | Vercel プロジェクト ID |
| `RENDER_DEPLOY_HOOK_URL` | Render デプロイ起動 URL |
| `RENDER_API_KEY` | Render デプロイ状態確認用 API キー |
| `RENDER_SERVICE_ID` | Render サービス ID（`srv-xxx` 形式） |

---

## ローカル起動

### 前提

- Docker Desktop
- VS Code + [Dev Containers拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/<your-username>/fambiz-prototype.git

# 2. VS Code で開き「Reopen in Container」を選択
#    → Node.js 20・pnpm・Supabase CLI が自動セットアップ
#    → pnpm install も自動実行

# 3. 環境変数を設定
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# 各ファイルに Supabase の接続情報を記入

# 4. Supabase をローカル起動
pnpm supabase start

# 5. マイグレーション・シード実行
pnpm supabase db push

# 6. 開発サーバー起動（web + api 並列）
pnpm dev
```

| サービス        | URL                    |
| --------------- | ---------------------- |
| Next.js (web)   | http://localhost:3000  |
| NestJS (api)    | http://localhost:3001  |
| Supabase Studio | http://localhost:54322 |

### よく使うコマンド

```bash
pnpm build       # 全パッケージビルド
pnpm lint        # lint（全パッケージ）
pnpm test        # Unit Test（全パッケージ）
pnpm test:e2e    # Integration Test（apps/api）
```

---

## ディレクトリ構成

```
fambiz-prototype/
├── .claude/               # Claude Code カスタマイズ
│   ├── commands/          # スラッシュコマンド定義（/implement など）
│   └── skills/            # 再利用スキル定義
├── .devcontainer/         # Dev Container 設定
├── apps/
│   ├── web/               # Next.js 14（App Router）
│   │   ├── src/app/
│   │   │   ├── (auth)/    # 認証画面群
│   │   │   └── (dashboard)/ # 機能画面群
│   │   └── CLAUDE.md      # フロント実装規約
│   └── api/               # NestJS
│       ├── src/modules/
│       │   ├── auth/      # 認証・JWT
│       │   ├── tasks/     # タスク管理
│       │   ├── goals/     # 目標管理
│       │   ├── rewards/   # 報酬計算
│       │   └── family/    # 家族グループ
│       └── CLAUDE.md      # バックエンド実装規約
├── packages/
│   ├── types/             # 共有TypeScript型定義
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
│   ├── requirements/      # 業務・機能・非機能要件
│   ├── design/            # OpenAPI / DBML / ワイヤーフレーム（22画面）
│   ├── adr/               # Architectural Decision Records（5件）
│   └── tasks/             # MVPタスクチェックリスト
├── infra/
│   └── supabase/          # マイグレーション・シードデータ
└── .github/workflows/     # CI/CD（lint・test・deploy）
```

---

## 非機能要件（目標値）

| 要件                 | 目標値    |
| -------------------- | --------- |
| 平均レスポンスタイム | 1秒以内   |
| 稼働率               | 99.9%以上 |
| 同時接続ユーザー     | 1,000人   |
| 最大想定ユーザー     | 10,000人  |
| データ復旧（RPO）    | 15分以内  |
| 障害復旧（RTO）      | 2時間以内 |

---

## ライセンス

MIT

## キャプチャ
<img width="561" height="555" alt="スクリーンショット 2026-07-02 10 29 42" src="https://github.com/user-attachments/assets/31c37f47-ec82-4e6b-b097-a4bf7a79b57a" />
<img width="1007" height="898" alt="スクリーンショット 2026-07-02 10 30 44" src="https://github.com/user-attachments/assets/c4b1ca20-c3d7-4d60-a7a0-3d4583552cf8" />
<img width="1017" height="948" alt="スクリーンショット 2026-07-02 10 31 00" src="https://github.com/user-attachments/assets/841f61c1-04ba-40b4-bda3-2c1451cb52fe" />
<img width="1026" height="595" alt="スクリーンショット 2026-07-02 10 32 26" src="https://github.com/user-attachments/assets/2103fe34-74fa-4c9a-8977-340998c2e69e" />
<img width="1002" height="1311" alt="スクリーンショット 2026-07-02 10 32 20" src="https://github.com/user-attachments/assets/30dd06cd-65e9-4000-88af-61baf8fce478" />
<img width="1027" height="1313" alt="スクリーンショット 2026-07-02 10 32 11" src="https://github.com/user-attachments/assets/a8c17041-6eee-4ece-9c69-841e1e128950" />
<img width="1012" height="1276" alt="スクリーンショット 2026-07-02 10 32 00" src="https://github.com/user-attachments/assets/2fe57105-0556-4a5c-979b-7cf2cf51dbd5" />
<img width="560" height="864" alt="スクリーンショット 2026-07-02 10 31 50" src="https://github.com/user-attachments/assets/bd4dd359-f5f0-482a-bb46-a0db40c7cb11" />
<img width="1026" height="1316" alt="スクリーンショット 2026-07-02 10 31 41" src="https://github.com/user-attachments/assets/22fafbf3-cabe-4d08-8def-f42f0115311d" />
<img width="716" height="979" alt="スクリーンショット 2026-07-02 10 32 53" src="https://github.com/user-attachments/assets/38c981c0-405c-40f4-b93b-60662d886452" />
<img width="429" height="667" alt="スクリーンショット 2026-07-02 10 32 39" src="https://github.com/user-attachments/assets/25aa232a-6508-4481-b006-160afb530fb2" />
<img width="715" height="669" alt="スクリーンショット 2026-07-02 10 32 33" src="https://github.com/user-attachments/assets/14dbd361-07ef-4663-822d-219daa07b8ba" />
<img width="1036" height="1310" alt="スクリーンショット 2026-07-02 10 31 27" src="https://github.com/user-attachments/assets/9eff5721-4405-406b-9797-2fb5300a3c7f" />
<img width="563" height="1062" alt="スクリーンショット 2026-07-02 10 31 17" src="https://github.com/user-attachments/assets/9fb01348-5ec0-455c-b743-7d6a39bdcbbe" />


