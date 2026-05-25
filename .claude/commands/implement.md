# /implement

**引数**: `$ARGUMENTS`（機能ID、例: `FUN-AUTH-001`、`FUN-TASK-003`）

機能IDを受け取り、NestJS APIとNext.jsフロントエンドをサブエージェントで**並列実装**します。

---

## 事前確認（実装前に必ず実施）

1. `docs/tasks/mvp-tasks.md` で対象タスクの状態（`[ ]` / `[~]` / `[x]`）を確認する
2. `docs/requirements/functional-requirements.md` で機能仕様を把握する
3. `docs/design/openapi.yaml` で対象APIのエンドポイント仕様を確認する
4. `docs/design/ui-spec.md` と `docs/design/wireframes/` で対象画面を確認する
5. 依存する前提タスク（🔴ブロッカー）が未完了なら、その旨を報告して停止する

---

## サブエージェント並列実行

事前確認が完了したら、**Agent ツールで以下2つのサブエージェントを同時に起動**する。

### サブエージェント A: APIバックエンド（NestJS）

プロンプト例:
```
FamBiz の <機能ID> のバックエンドを実装してください。

参照仕様:
- openapi.yaml の該当エンドポイント
- apps/api/CLAUDE.md の規約

実装対象:
- apps/api/src/modules/<domain>/ 配下
  - <domain>.module.ts
  - <domain>.controller.ts  （@UseGuards(JwtAuthGuard, RolesGuard) 必須）
  - <domain>.service.ts     （ビジネスロジックのみ）
  - <domain>.repository.ts  （全クエリに family_group_id フィルタ必須）
  - dto/ 配下の DTO クラス
  - <domain>.service.spec.ts（Unit テスト）

業務ルール（厳守）:
- 親専用操作（タスク登録・承認・報酬確定）に @Roles('parent') を付与
- 全クエリに .eq('family_group_id', user.family_group_id) を含める
- 端数計算は Math.floor() のみ使用
- 日付計算は date-fns-tz で Asia/Tokyo を指定
```

### サブエージェント B: フロントエンド（Next.js）

プロンプト例:
```
FamBiz の <機能ID> のフロントエンドを実装してください。

参照仕様:
- docs/design/ui-spec.md の該当画面（SCR-xxx）
- docs/design/wireframes/ の対応画面
- apps/web/CLAUDE.md の規約

実装対象:
- apps/web/src/app/(dashboard)/<route>/ 配下
  - page.tsx      （Server Component でデータフェッチ）
  - loading.tsx   （ローディング状態）
  - error.tsx     （エラー境界）
- 必要に応じて components/ にコンポーネントを追加

実装規約（厳守）:
- データフェッチは Server Component で行う
- インタラクション部分のみ 'use client' を付与
- APIコールは src/lib/api/fetcher.ts の apiFetch を使用
- 型は packages/types の共有型を使用
- 親専用UIは <RoleGate role="parent"> で制御
- 日付表示は toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
```

---

## 実装完了後

1. 両エージェントの結果を統合確認する（型の不一致がないか）
2. `docs/tasks/mvp-tasks.md` の対象タスクを `[ ]` → `[x]` に更新する
3. コミットメッセージは `feat(<domain>): <機能ID> <機能名>を実装` の形式で作成する
