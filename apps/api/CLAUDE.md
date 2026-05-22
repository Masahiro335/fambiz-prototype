# CLAUDE.md — apps/api（NestJS）固有規約

> NestJS バックエンドの実装規約。ルートの `CLAUDE.md` と合わせて参照すること。

---

## アーキテクチャ概要

```
apps/api/src/
├── modules/
│   ├── auth/        # API-AUTH-001〜007: 認証・JWT・Supabase Auth連携
│   ├── family/      # API-GROUP-001〜006: 家族グループ・QRコード招待
│   ├── tasks/       # API-TASK-001〜007: タスクCRUD・ステータス遷移・承認
│   ├── goals/       # API-GOAL-001〜005: 目標CRUD・達成判定・ボーナス計算
│   └── rewards/     # API-REWARD-001〜004: 月次報酬集計・支払い完了
├── shared/
│   ├── guards/      # JwtAuthGuard / RolesGuard
│   ├── decorators/  # @Roles() / @CurrentUser()
│   ├── filters/     # GlobalExceptionFilter
│   └── interceptors/
└── config/          # 環境変数バリデーション（@nestjs/config + Joi）
```

---

## モジュール構成の規約

各ドメインモジュールは以下のファイル構成に従う。

```
tasks/
├── tasks.module.ts
├── tasks.controller.ts   # HTTPエンドポイント定義
├── tasks.service.ts      # ビジネスロジック
├── tasks.repository.ts   # Supabaseとのデータアクセス
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   └── task-response.dto.ts
└── tasks.service.spec.ts # Unitテスト
```

- **Controller**: HTTPの入出力のみ担当。ビジネスロジックを書かない。
- **Service**: ビジネスロジックの実装場所。副作用は Repository 経由のみ。
- **Repository**: Supabaseクライアントを使ったデータアクセスのみ担当。

---

## 命名規約

| 対象 | 形式 | 例 |
|------|------|-----|
| クラス名 | PascalCase | `TasksService`, `CreateTaskDto` |
| ファイル名 | kebab-case | `tasks.service.ts`, `create-task.dto.ts` |
| メソッド名 | camelCase | `findAllByFamily`, `approveTask` |
| APIエンドポイント | kebab-case | `/tasks/:id/approve` |
| DBカラム名 | snake_case | `family_group_id`, `unit_price` |

---

## 認証・認可の実装パターン

```typescript
// 全エンドポイントにJWTガード + ロール制御を適用すること
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {

  // 全ロール参照可能
  @Get()
  findAll(@CurrentUser() user: JwtPayload) { ... }

  // 親のみ操作可能
  @Post()
  @Roles('parent')
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: JwtPayload) { ... }

  // 親のみ承認可能
  @Patch(':id/approve')
  @Roles('parent')
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) { ... }
}
```

---

## family_group_id による分離の徹底

**必ず `user.family_group_id` をWHERE条件に含めること。** 漏れると他家族のデータが見える。

```typescript
// ✅ 正しい（family_group_idフィルタあり）
async findAllTasks(user: JwtPayload) {
  return this.supabase
    .from('tasks')
    .select('*')
    .eq('family_group_id', user.family_group_id);
}

// ❌ 絶対禁止（全タスクが返ってしまう）
async findAllTasks() {
  return this.supabase.from('tasks').select('*');
}
```

---

## レスポンス形式

```typescript
// 成功レスポンスは常に packages/types の型に準拠させる
// エラーはGlobalExceptionFilterで統一形式に変換

// エラーレスポンスの例
{
  "statusCode": 400,
  "message": "承認済みタスクは取り下げできません",
  "error": "Bad Request"
}
```

---

## テスト方針

- **Unit Test（必須）**: 各Serviceのビジネスロジックをテスト。Repository・Supabaseはモックする。
- **Integration Test（任意）**: 主要フローのE2E（タスク報告→承認→報酬確定）。

```bash
# テスト実行
pnpm test              # Unit test
pnpm test:e2e          # Integration test
pnpm test:cov          # カバレッジ付き
```

---

## 環境変数

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=  # サーバーサイド用（RLS bypass不要なので anon_key も可）
SUPABASE_JWT_SECRET=        # JWTの署名検証用
DATABASE_URL=               # 必要に応じてPrisma直接接続用
PORT=3001
NODE_ENV=development
```

---

## よくあるミス

- `@Roles()` デコレーターをつけ忘れて全ロールがアクセス可能になる → 全Controllerメソッドで確認
- タイムゾーンを考慮せず `new Date()` で集計すると UTC / JST ずれが起きる → `date-fns-tz` で `Asia/Tokyo` 指定
- `Math.round()` や `Math.ceil()` を使った端数処理 → 必ず `Math.floor()`（ADR-0004）
