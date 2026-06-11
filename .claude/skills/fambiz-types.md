# fambiz-types

`packages/types` の共有型を追加・変更するときのパターン。API と Web の両方に影響するため慎重に行う。

## 使用タイミング

- 新しいドメイン（tasks / goals / rewards）の型を追加するとき
- API レスポンスの型を変更するとき
- DTO をフロントエンドと共有する型に昇格させるとき

---

## ファイル構成

```
packages/types/src/
├── index.ts       # 全エクスポートのバレル
├── common.ts      # 共通型（ページネーション・エラー等）
├── user.ts        # ユーザー・認証
├── group.ts       # 家族グループ
├── task.ts        # タスク・タスク完了
├── goal.ts        # 目標
└── reward.ts      # 月次報酬
```

---

## 型追加の手順

### 1. ドメインファイルに型を追加

```typescript
// packages/types/src/<domain>.ts

export type <Domain>Status = 'pending' | 'active' | 'completed';

export interface <Domain> {
  id: string;
  group_id: string;           // family_group_id（必須）
  // ... ドメイン固有フィールド
  created_at: string;         // ISO 8601
  updated_at: string;         // ISO 8601
}

// APIへのリクエスト型
export interface Create<Domain>Dto {
  // POST リクエストボディ
}

export interface Update<Domain>Dto {
  // PATCH リクエストボディ（全フィールドをオプショナルに）
}
```

### 2. index.ts に re-export を追加

```typescript
// packages/types/src/index.ts
export * from './<domain>';  // 追加
```

### 3. API 側で使用

```typescript
// apps/api/src/modules/<domain>/<domain>.service.ts
import type { <Domain>, Create<Domain>Dto } from '@fambiz/types';
```

### 4. Web 側で使用

```typescript
// apps/web/src/app/(dashboard)/<route>/page.tsx
import type { <Domain> } from '@fambiz/types';
```

---

## 型設計の規約

| 規約 | 内容 |
|------|------|
| 日時フィールド | `string`（ISO 8601）で定義。`Date` 型は使わない |
| ID フィールド | `string`（UUID）で定義 |
| NULL 許容 | `string \| null` を使う（`undefined` は避ける） |
| オプショナル | DTO の更新系は `field?: Type` にする |
| group_id | 全ドメインエンティティに必須（`family_group_id` の実体） |

---

## 既存の主要型

| 型名 | ファイル | 用途 |
|------|---------|------|
| `User` | user.ts | ユーザープロフィール |
| `JwtPayload` | user.ts | JWT クレーム（`family_group_id` / `role` を含む） |
| `Group` | group.ts | 家族グループ |
| `Task` / `TaskStatus` | task.ts | タスクと状態 |
| `TaskCompletion` | task.ts | タスク完了記録 |
| `Goal` | goal.ts | 目標設定 |
| `Reward` | reward.ts | 月次報酬 |

---

## 変更時の注意

- 既存フィールドの**削除・型変更**は API と Web 両方のコンパイルエラーを確認してから行う
- API の NestJS DTO クラスと `packages/types` の DTO インターフェースは**同名・同フィールド**を維持する
- DB カラム名（snake_case）と型フィールド名（snake_case）を一致させる

```bash
# 型変更後に両アプリのビルドを確認
pnpm build
```
