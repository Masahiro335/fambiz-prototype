# fambiz-implement

FamBiz の機能を実装するときに参照するスキル。NestJS と Next.js の両方に対応。

## 使用タイミング

- 機能IDに基づいて API または画面を新規実装するとき
- 既存モジュールに機能を追加・修正するとき

---

## APIバックエンド（NestJS）実装手順

### 1. 仕様確認
- `docs/design/openapi.yaml` で対象エンドポイントのパス・スキーマを確認
- `docs/requirements/functional-requirements.md` で業務ルールを確認

### 2. ファイル構成
```
apps/api/src/modules/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts
├── <domain>.service.ts
├── <domain>.repository.ts
├── dto/
│   ├── create-<domain>.dto.ts
│   ├── update-<domain>.dto.ts
│   └── <domain>-response.dto.ts
└── <domain>.service.spec.ts
```

### 3. Controller の必須パターン
```typescript
@Controller('<domain>')
@UseGuards(JwtAuthGuard, RolesGuard)
export class <Domain>Controller {
  // 全ロール参照可能
  @Get()
  findAll(@CurrentUser() user: JwtPayload) { ... }

  // 親のみ操作可能
  @Post()
  @Roles('parent')
  create(@Body() dto: Create<Domain>Dto, @CurrentUser() user: JwtPayload) { ... }
}
```

### 4. Repository の必須パターン
```typescript
// 全クエリに family_group_id フィルタを含める（絶対厳守）
async findAll(familyGroupId: string) {
  return this.supabase
    .from('<table>')
    .select('*')
    .eq('family_group_id', familyGroupId);
}
```

### 5. 業務ルール実装チェックリスト
- [ ] `@UseGuards(JwtAuthGuard, RolesGuard)` を Controller クラスに付与
- [ ] 親専用操作に `@Roles('parent')` を付与
- [ ] 全クエリに `.eq('family_group_id', user.family_group_id)` を含める
- [ ] 端数計算は `Math.floor()` のみ使用（`Math.round()` / `Math.ceil()` 禁止）
- [ ] 日付計算は `date-fns-tz` で `Asia/Tokyo` を指定
- [ ] DTO に `class-validator` でバリデーションを付与
- [ ] タスクステータス遷移の不正チェックを Service で実装
- [ ] Unit Test: Service のビジネスロジックをモックでテスト

---

## フロントエンド（Next.js）実装手順

### 1. 仕様確認
- `docs/design/ui-spec.md` で対象画面（SCR-xxx）を確認
- `docs/design/wireframes/` で画面レイアウトを確認

### 2. ファイル構成
```
apps/web/src/app/(dashboard)/<route>/
├── page.tsx        # Server Component（データフェッチ）
├── loading.tsx     # ローディング状態
└── error.tsx       # エラー境界
apps/web/src/components/
└── <Feature>.tsx   # ドメインコンポーネント（必要に応じて）
```

### 3. データフェッチパターン（Server Component）
```typescript
// page.tsx（Server Component）
export default async function <Feature>Page() {
  const data = await apiFetch<ResponseType[]>('/<endpoint>');
  return <FeatureList items={data} />;
}
```

### 4. インタラクションパターン（Client Component）
```typescript
// components/<Feature>.tsx
'use client';
export function <Feature>({ ... }) {
  const [isPending, startTransition] = useTransition();
  // イベントハンドラはここに
}
```

### 5. ロール制御パターン
```tsx
// 親のみ表示するUIを RoleGate でラップ
<RoleGate role="parent">
  <ApproveButton taskId={task.id} />
</RoleGate>
```

### 6. フロント実装チェックリスト
- [ ] データフェッチは Server Component で実行（`'use client'` は最小単位に）
- [ ] APIコールは `src/lib/api/fetcher.ts` の `apiFetch` を使用
- [ ] 型は `packages/types` の共有型を使用（ローカルで再定義しない）
- [ ] 日付表示は `toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })`
- [ ] `loading.tsx` と `error.tsx` を必ず配置
- [ ] 親専用UIは `<RoleGate role="parent">` でラップ
