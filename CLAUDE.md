# CLAUDE.md — FamBiz リポジトリ全体指示書

> このファイルはClaude Codeが実装時に**最優先で参照**する指示書です。  
> アプリ固有の規約は `apps/api/CLAUDE.md` と `apps/web/CLAUDE.md` を参照してください。

---

## プロジェクト概要

**FamBiz** — 家庭内タスク管理・お小遣い管理Webアプリ（家庭内教育支援）

- 親が家事タスクを登録 → 子が実行報告 → 親が承認 → お小遣いが確定する仕組み
- スタック: Next.js 14（App Router）+ NestJS + Supabase（PostgreSQL + Auth）+ Turborepo

---

## ディレクトリ構成

```
fambiz-prototype/
├── apps/             # モノレポ内のアプリケーション群
│   ├── web/          # Next.js 14 フロントエンド（Vercel）
│   └── api/          # NestJS バックエンド（Render）
├── packages/         # モノレポ内で共有するパッケージ群
│   ├── types/        # フロント・バック共有のTypeScript型定義
│   ├── eslint-config/ # ESLint設定
│   └── tsconfig/      # TypeScript設定
├── docs/             # ドキュメント全般
│   ├── requirements/ # 業務・機能・非機能要件
│   ├── design/       # openapi.yaml / schema.dbml / ui-spec.md
│   │   ├── diagrams/ # ユースケース図・フロー図・ER図・画面遷移図
│   │   └── wireframes/ # 画面別レイアウト仕様 + PNG画像（全22画面）
│   ├── adr/          # ADR（Architectural Decision Records）
│   └── tasks/        # 実装タスクリスト
├── infra/            # インフラ関連コード（Terraform / Dockerfile / Supabase CLI）
│   └── supabase/     # マイグレーション・シードデータ
├── .github/workflows/ # GitHub ActionsのCI/CDワークフロー定義
├── turbo.json      # Turborepoのビルドキャッシュ設定
└── CLAUDE.md     # 全体指示書（このファイル）
```

---

## 言語・フォーマット規約

- **言語**: TypeScript（strict: true）を全アプリ・パッケージで統一
- **フォーマット**: Prettier（設定は `packages/eslint-config` に従う）
- **コメント**: コード内コメントは**日本語**で記述する
- **変数・関数名**: **英語（camelCase / PascalCase）** で記述する

---

## 重要な業務ルール（実装時に必ず守ること）

1. **ロール制御**: 全APIエンドポイントに `JwtAuthGuard` + `RolesGuard` を適用する。親のみが操作できる処理（タスク登録・承認・報酬確定）では `@Roles('parent')` を必須とする。

2. **家族グループ分離**: データ取得・更新のクエリには必ず `family_group_id` フィルタを含める。他家族のデータへのアクセスを絶対に許容しない。SupabaseのRLSポリシーと二重でチェックする。

3. **報酬計算**: 端数は必ず `Math.floor()` で切り捨てる。四捨五入・切り上げ禁止（ADR-0004参照）。

4. **タイムゾーン**: 日付計算・集計期間の判定は必ず `Asia/Tokyo（JST）` で行う。サーバーサイドで計算し、フロントへはISO 8601文字列で渡す。

5. **タスクステータス遷移**: 不正なステータス遷移をバックエンドで厳密に検証する。承認済みタスクの取り下げはエラーを返す。

---

## ブランチ戦略

```
main          # プロダクション（Vercel/Renderへ自動デプロイ）
develop       # 開発統合ブランチ
feature/xxx   # 機能開発（例: feature/fun-task-approval）
fix/xxx       # バグ修正
```

- PRはすべて `develop` へマージ
- `develop → main` のマージ時にデプロイが走る
- ブランチ名には機能ID（FUN-xxx）を含めることを推奨

---

## コミットメッセージ規約

```
<type>(<scope>): <subject>

例:
feat(tasks): FUN-TASK-004 タスクステータス変更APIを実装
fix(auth): JWTクレームの検証ロジックを修正
docs(adr): ADR-0003 Supabase Auth方針を追記
```

| type     | 使用場面         |
| -------- | ---------------- |
| feat     | 新機能           |
| fix      | バグ修正         |
| docs     | ドキュメント更新 |
| refactor | リファクタリング |
| test     | テスト追加・修正 |
| chore    | ビルド・設定変更 |

---

## 環境変数

`.env.local`（web）と `.env`（api）を使用。**コードにシークレットをハードコードしない。**

```bash
# 共通（Supabase）
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=

# api のみ
DATABASE_URL=         # Supabase接続URL（NestJS/Prisma用）

# web のみ
NEXT_PUBLIC_API_URL=  # NestJS APIのベースURL
```

---

## よく使うコマンド

```bash
# 全パッケージインストール
pnpm install

# 開発サーバー起動（web + api 並列）
pnpm dev

# ビルド（全パッケージ）
pnpm build

# lint（全パッケージ）
pnpm lint

# テスト（全パッケージ）
pnpm test

# Supabaseマイグレーション実行
pnpm supabase db push
```

---

## 参照ドキュメント

- 業務要件: `docs/requirements/business-requirements.md`
- 機能要件: `docs/requirements/functional-requirements.md`
- 非機能要件: `docs/requirements/non-functional-requirements.md`
- ADR一覧: `docs/adr/`
- 実装タスクリスト: `docs/tasks/mvp-tasks.md`
- アプリ固有規約: `apps/api/CLAUDE.md` / `apps/web/CLAUDE.md`
