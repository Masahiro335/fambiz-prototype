# ADR-0005: Dev Container による開発環境の標準化

| 項目       | 値         |
| ---------- | ---------- |
| ステータス | 承認済み   |
| 決定日     | 2026-05-22 |
| 決定者     | 開発者     |

---

## コンテキスト

FamBiz はフロントエンド（Next.js 14）・バックエンド（NestJS）・DB/Auth（Supabase）という3層構成のモノレポであり、ローカル開発に必要なツールが多岐にわたる。

- **Node.js 20** — Next.js 14 および NestJS の実行環境
- **pnpm** — Turborepo との組み合わせが公式推奨のパッケージマネージャー（ADR-0001参照）
- **Supabase CLI** — ローカルで PostgreSQL + Auth を起動し、マイグレーション・シードを実行するために必須
- **GitHub CLI** — PR作成・Issue操作をターミナルから実行する

これらのツールをメンバーが個別にセットアップする場合、バージョン差異によるビルドエラー・マイグレーション失敗が生じる。将来的にコントリビューターや家族に開発を引き継ぐ場面でも、セットアップ手順書の陳腐化が問題になりやすい。

---

## 決定

**Dev Container（`.devcontainer/devcontainer.json`）を導入し、開発環境をコードとして管理する。**

Y-Statement形式:

> ローカルツールのバージョン差異によるビルド失敗と「自分の環境でしか動かない」問題を排除したいというコンテキストにおいて、開発環境の再現性と新規参加者のオンボーディング速度向上のために、Dev Container による環境標準化を採用することを決定した。各自のローカル環境に直接インストールするという代替案に比べ、Dockerが必要というトレードオフを受け入れる。

---

## 採用理由

### 1. 環境の再現性（"works on my machine" 問題の排除）

Node.js・pnpm・Supabase CLI のバージョンをコードで固定することで、開発者全員が同一のツール環境で作業できる。ホストOSが macOS でも Windows でも動作する。

### 2. セットアップ時間の短縮

新規参加者が必要な作業は「VS Code で Reopen in Container」のみ。pnpm install もコンテナ作成後に自動実行される。個別のインストール手順書が不要になる。

### 3. Supabase ローカル開発との親和性

Supabase CLI を Dev Container に組み込むことで、`supabase start` によるローカルDB起動がどの環境でも同じ手順で行える。ポートフォワーディング設定により、Supabase Studio（ポート 54322）にブラウザから直接アクセスできる。

### 4. CI/CD との整合性

コンテナイメージ（`typescript-node:1-20-bookworm`）と CI で使用する Node.js バージョンを揃えることで、「CIは通るがローカルでは失敗する」問題を防げる。

### 5. VS Code 拡張・設定の統一

ESLint・Prettier・TypeScript のバージョンと設定をコードで共有するため、コードフォーマットの差異によるノイズが diff に混入しない。

---

## 構成の詳細

| 項目 | 内容 |
|------|------|
| ベースイメージ | `mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm`（Node.js 20 LTS / Debian Bookworm） |
| GitHub CLI | `ghcr.io/devcontainers/features/github-cli:1` |
| Claude Code | `ghcr.io/anthropics/devcontainer-features/claude-code:1.0` |
| pnpm | Node.js 20 同梱の `corepack` 経由で有効化（`corepack enable && corepack prepare pnpm@latest --activate`） |
| Supabase CLI | `npm install -g supabase`（`devcontainers-contrib` の feature は非推奨のため npm 経由に変更） |
| postCreateCommand | `corepack enable && corepack prepare pnpm@latest --activate && npm install -g supabase && pnpm install` |

### ポートフォワーディング

| ポート | 用途 |
|--------|------|
| 3000 | Next.js 開発サーバー（apps/web） |
| 3001 | NestJS API サーバー（apps/api） |
| 54321 | Supabase ローカル API |
| 54322 | Supabase Studio（DB管理GUI） |
| 54323 | Supabase Inbucket（メールテスト） |

---

## 代替案の検討

| 案 | 内容 | 却下理由 |
|----|------|---------|
| 手順書によるローカルセットアップ | README に各ツールのインストール手順を記載 | ツールのバージョンアップや OS 差異で手順書が陳腐化する。バージョン不一致によるトラブルシュートコストが高い |
| Docker Compose のみ | `docker-compose.yml` でサービスを定義し直接起動 | IDE との統合がないため、拡張機能・TypeScript 補完・デバッガーを別途設定する必要がある |
| Nix / nix-shell | Nix パッケージマネージャーで環境を管理 | 学習コストが高く、個人開発規模では過剰。VS Code 統合も Dev Container ほど成熟していない |
| GitHub Codespaces | クラウド上で Dev Container を実行 | Dev Container 設定があれば Codespaces でも自動的に動作するため、設定を共通化できる（排他ではなく補完関係） |
| devcontainers-contrib の pnpm/Supabase feature | `ghcr.io/devcontainers-contrib` feature でインストール | pnpm は Node.js 20 同梱の corepack で管理するほうがバージョン整合性が高い。Supabase CLI の feature は非推奨になったため npm 経由に移行 |

---

## 影響範囲

- `.devcontainer/devcontainer.json` — 開発環境の定義ファイル（新規追加）
- 開発者は VS Code + Dev Containers 拡張機能（または GitHub Codespaces）が必要
- Docker Desktop（またはDocker Engine）が開発マシンにインストールされている必要がある
- `pnpm install` は postCreateCommand で自動実行されるため、コンテナ起動後すぐに `pnpm dev` を実行できる
