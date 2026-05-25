# fambiz-security

FamBizのセキュリティ要件を確認するスキル。PRレビュー前や新規APIエンドポイント追加時に使用する。

## 使用タイミング

- 新しい Controller / Repository を追加・修正したとき
- PRレビュー前にセキュリティ観点で自己チェックしたいとき
- `/security-audit` コマンドのサブエージェントから参照するとき

---

## チェック 1: 認証・認可

### 確認対象
`apps/api/src/modules/*/` 配下の `*.controller.ts`

### ルール
| 確認項目 | 合格条件 | 失敗例 |
|---------|---------|--------|
| Guard 適用 | 全 `@Controller` クラスに `@UseGuards(JwtAuthGuard, RolesGuard)` がある | Guard が未付与 |
| 親専用操作 | タスク登録・承認・報酬確定・目標登録に `@Roles('parent')` がある | `@Roles()` 漏れ |
| 公開エンドポイント | `/auth/register` と `/auth/login` のみ認証不要 | 他のエンドポイントが誤って公開 |

### 親専用操作の一覧（必ず @Roles('parent') が必要）
- `POST /tasks` — タスク登録
- `PATCH /tasks/:id/approve` — タスク承認
- `POST /goals` — 目標登録
- `PATCH /goals/:id` — 目標更新
- `POST /rewards` — 報酬確定
- `POST /family/invite` — 招待QR生成

---

## チェック 2: family_group_id 分離

### 確認対象
- `apps/api/src/modules/*/` 配下の `*.repository.ts`
- `infra/supabase/migrations/` の RLS ポリシー

### ルール
| 確認項目 | 合格条件 | 失敗例 |
|---------|---------|--------|
| SELECT | `.eq('family_group_id', familyGroupId)` が含まれる | フィルタなしで全件取得 |
| UPDATE | `family_group_id` の一致確認がある | ID だけで UPDATE |
| DELETE | `family_group_id` の一致確認がある | ID だけで DELETE |
| RLS | 全テーブルに `ENABLE ROW LEVEL SECURITY` がある | RLS 未設定のテーブル |

### 禁止パターン
```typescript
// ❌ 絶対禁止: family_group_id フィルタなし
this.supabase.from('tasks').select('*');

// ✅ 必須: family_group_id フィルタあり
this.supabase.from('tasks').select('*').eq('family_group_id', familyGroupId);
```

---

## チェック 3: 計算精度（端数処理）

### 確認対象
報酬・ボーナス計算ロジック（`rewards.service.ts`, `goals.service.ts`）

### ルール
| 確認項目 | 合格条件 | 失敗例 |
|---------|---------|--------|
| 端数処理 | `Math.floor()` のみ使用 | `Math.round()` や `Math.ceil()` の使用 |

根拠: ADR-0004（子への過払い防止のため切り捨て統一）

---

## チェック 4: タイムゾーン

### 確認対象
- API: 日付集計・月次判定ロジック（`*.service.ts`）
- Web: 日付表示コンポーネント（`*.tsx`）

### ルール
| 確認項目 | 合格条件 | 失敗例 |
|---------|---------|--------|
| API 日付計算 | `date-fns-tz` で `Asia/Tokyo` を指定 | `new Date()` を直接使用 |
| Web 日付表示 | `toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })` | `toLocaleDateString()` にタイムゾーン未指定 |

---

## 総合判定

全チェックが合格 → **✅ セキュリティ要件を満たしています**

1つでも失敗 → **⚠️ 要修正**: 失敗箇所のファイルパス・行番号・修正方法を報告する
