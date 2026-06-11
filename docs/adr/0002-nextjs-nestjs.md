# ADR-0002: フロントエンド（Next.js App Router）とバックエンド（NestJS）の技術選定

| 項目 | 値 |
|------|-----|
| ステータス | 承認済み |
| 決定日 | 2025-12-01 |
| 決定者 | 開発者 |

---

## コンテキスト

FamBizは家族向けWebアプリケーションであり、以下の要件を持つ。

- スマートフォン・PCの両方からアクセスされる
- 親・子の権限に応じた画面表示が必要（ロールベース）
- タスク一覧・報酬ダッシュボード等の動的データを表示する
- 将来的にマイクロサービス化を視野に入れた拡張性が求められる
- 個人開発（ポートフォリオ）のため、TypeScript統一によるコンテキストスイッチの最小化が重要

---

## 決定

**フロントエンドに Next.js 14（App Router）、バックエンドに NestJS を採用する。両者ともTypeScriptで実装する。**

Y-Statement形式（フロント）:

> 動的データを扱うSPAとSEO・パフォーマンスを両立させたいというコンテキストにおいて、レンダリング方式の柔軟性（SSR/SSG/ISR/CSR）と Vercelとの親和性のために、Next.js 14（App Router）を採用することを決定した。Create React App等の純粋なCSR構成という代替案に比べ、App Routerの学習コストがかかるというトレードオフを受け入れる。

Y-Statement形式（バックエンド）:

> 大規模化を見据えたスパゲッティコード化防止と型安全なAPI設計が必要なコンテキストにおいて、TypeScriptファーストのアーキテクチャとモジュール強制による保守性向上のために、NestJSを採用することを決定した。Express/Fastify等の軽量フレームワークという代替案に比べ、初期セットアップコストが高いというトレードオフを受け入れる。

---

## フロントエンド（Next.js App Router）採用理由

1. **レンダリングの柔軟性**: RSC（React Server Components）でサーバーサイドのデータフェッチ、Clientコンポーネントでインタラクションと使い分け可能。タスク一覧はRSC、リアルタイムフィードバックはClientで実装。

2. **Vercelとの親和性**: デプロイが `git push` だけで完結。Preview環境が自動生成され、プロトタイプのフィードバックループが短縮できる。

3. **TypeScriptとの相性**: 完全なTypeScriptサポート。`packages/types`の共有型をそのまま利用できる。

4. **App Router（pages→app）**: Layouts・Loading・Error境界がファイルシステムで表現でき、FamBizの画面階層（認証→ダッシュボード→タスク詳細）に自然にマッピングできる。

---

## バックエンド（NestJS）採用理由

1. **TypeScriptファースト設計**: TypeScriptを前提として設計されており、型安全なAPIが保証される。Express等と異なり、後付けの型定義不要。

2. **モジュール強制によるスパゲッティ防止**: `auth/`・`tasks/`・`goals/`・`rewards/`・`family/` を独立したNestJSモジュールとして分割。ドメイン間の依存が明確になり、将来のマイクロサービス分割が容易。

3. **DI（依存性注入）コンテナ**: テスタビリティが高い。MockでServiceを差し替えたUnit Testが書きやすく、ポートフォリオとしてのコード品質を担保できる。

4. **デコレーター文化**: `@Controller`・`@UseGuards`・`@Roles` 等のデコレーターで意図が宣言的に読める。コードレビューコストが低い。

5. **Expressとの互換**: 内部的にExpress（またはFastify）を使用するため、Expressエコシステムのミドルウェアが流用できる。

---

## 代替案の検討

| レイヤー | 代替案 | 却下理由 |
|---------|-------|---------|
| フロント | Create React App | SSR/ISR不可。Vercelの最適化を活かせない |
| フロント | SvelteKit / Nuxt | Reactエコシステムからの脱却コストが高い |
| バックエンド | Express + TypeScript | アーキテクチャを自前定義する必要があり、スパゲッティ化リスク |
| バックエンド | Fastify単体 | 同上 |
| バックエンド | Next.js API Routes（BFF） | バックエンドロジックが肥大化しやすく、将来のマイクロサービス化と相性が悪い |

---

## 影響範囲

- `apps/web/`: Next.js 14 App Router。`src/app/(auth)/`・`(dashboard)/`・`tasks/`・`goals/`・`rewards/`・`family/` の構成。
- `apps/api/`: NestJS。`src/modules/auth/`・`tasks/`・`goals/`・`rewards/`・`family/` のモジュール構成。
- API通信: フロントはNext.jsのServer Componentsから直接NestJSのREST APIを呼び出す（型安全なfetch wrapper経由）。
- 認証: Supabase AuthのJWTをNestJS側でGuardを使って検証する（ADR-0003参照）。
