# ER 図（FamBiz）

## 概要

FamBiz のデータベースを構成する全エンティティと、それらのリレーションを表した ER 図です。`schema.dbml`（プロトタイプ版 Supabase / PostgreSQL）をもとに作成しています。ステータス系のフィールドはマスタテーブルではなく Enum 型（PostgreSQL）で管理します。各エンティティには主キー（PK）と主要な外部キー（FK）を明示しています。

## 図

```mermaid
erDiagram
    users ||--o{ groups : "owner_id（グループ作成者）"
    users ||--o{ group_members : "user_id（メンバー）"
    groups ||--o{ group_members : "group_id（所属グループ）"
    groups ||--o{ tasks : "group_id（タスク）"
    users ||--o{ tasks : "creator_id（作成者）"
    tasks ||--o{ task_completions : "task_id（実績）"
    users ||--o{ task_completions : "child_id（報告者）"
    groups ||--o{ goals : "group_id（目標）"
    users ||--o{ goals : "creator_id（作成者）"
    tasks ||--o{ goals : "task_id（対象タスク、任意）"
    groups ||--o{ rewards : "group_id（報酬）"
    users ||--o{ rewards : "child_id（受取者）"

    users {
        uuid id PK
        varchar email "メールアドレス（ログインID）"
        varchar password_hash "パスワードハッシュ"
        varchar name "表示名"
        enum role "続柄（parent / child）"
        varchar avatar_url "アイコン画像URL（任意）"
        varchar comment "コメント（任意）"
        boolean deleted_flag "削除フラグ"
        timestamptz created_at
        timestamptz updated_at
    }

    groups {
        uuid id PK
        varchar group_name "家族グループ名"
        varchar invite_code "QRコード招待用トークン（任意）"
        uuid owner_id FK "作成者（親）"
        boolean deleted_flag "削除フラグ"
        timestamptz created_at
        timestamptz updated_at
    }

    group_members {
        uuid id PK
        uuid group_id FK "所属する家族グループ"
        uuid user_id FK "所属するユーザー"
        timestamptz joined_at "参加日時"
        boolean deleted_flag "削除フラグ"
        timestamptz created_at
        timestamptz updated_at
    }

    tasks {
        uuid id PK
        uuid group_id FK "対象の家族グループ"
        uuid creator_id FK "作成者（親）"
        uuid assignee_id FK "担当する子（任意）"
        varchar task_name "タスク名"
        varchar category "タスク分類（任意）"
        integer reward_amount "単価（円）"
        enum status "ステータス（pending/reported/completed/cancelled/expired）"
        timestamptz start_time "開始時間（任意）"
        timestamptz end_time "終了時間（任意）"
        timestamptz due_date "有効期限（任意）"
        varchar memo "メモ（任意）"
        boolean deleted_flag "削除フラグ"
        timestamptz created_at
        timestamptz updated_at
    }

    task_completions {
        uuid id PK
        uuid task_id FK "対象タスク"
        uuid child_id FK "実行報告した子"
        timestamptz reported_at "実行報告日時"
        uuid approved_by FK "承認した親（任意）"
        timestamptz approved_at "承認日時（任意）"
        integer confirmed_reward "確定報酬額"
        boolean deleted_flag "削除フラグ"
        timestamptz created_at
        timestamptz updated_at
    }

    goals {
        uuid id PK
        uuid group_id FK "対象の家族グループ"
        uuid creator_id FK "作成者（親）"
        uuid assignee_id FK "挑戦する子（任意）"
        uuid task_id FK "対象タスク（定量目標、任意）"
        varchar goal_name "目標名"
        integer goal_reward "達成ボーナス（円）"
        integer target_count "タスク完了回数（定量目標、任意）"
        varchar action "行動（定性目標、任意）"
        boolean and_condition_flag "AND条件フラグ"
        enum status "ステータス（not_started/in_progress/achieved/failed）"
        char target_month "対象月（YYYY-MM）"
        boolean deleted_flag "削除フラグ"
        timestamptz created_at
        timestamptz updated_at
    }

    rewards {
        uuid id PK
        uuid group_id FK "対象の家族グループ"
        uuid child_id FK "報酬を受け取る子"
        char target_month "集計対象月（YYYY-MM）"
        integer task_reward_total "タスク確定報酬の合計"
        integer bonus_reward_total "目標達成ボーナスの合計"
        integer total_amount "月次合計報酬額"
        smallint evaluation_score "月次評価（星 1〜5、任意）"
        varchar evaluation_comment "月次評価コメント（任意）"
        enum status "支払いステータス（pending/paid）"
        timestamptz paid_at "支払い完了日時（任意）"
        boolean deleted_flag "削除フラグ"
        timestamptz created_at
        timestamptz updated_at
    }
```

## Enum 定義

| Enum名 | 値 | 説明 |
|--------|-----|------|
| `user_role` | `parent` / `child` | ユーザーの続柄（親 / 子） |
| `task_status` | `pending` / `reported` / `completed` / `cancelled` / `expired` | タスクステータス（未対応 / 対応済 / 完了 / キャンセル済 / 期限切れ） |
| `goal_status` | `not_started` / `in_progress` / `achieved` / `failed` | 目標ステータス（未挑戦 / 挑戦中 / 達成済 / 未達成） |
| `reward_status` | `pending` / `paid` | 支払いステータス（未払い / 支払い完了） |

## 補足

- 全テーブルに論理削除用の `deleted_flag`（削除フラグ）を保持します。
- ユーザーの続柄（親／子）は `users.role` の Enum 型で管理し、JWTカスタムクレームにも含めます（ADR-0003 参照）。
- 家族グループとユーザーは `group_members` を介した多対多の中間テーブルで紐付きます。
- タスクの実行報告・承認記録は `task_completions` テーブルで管理します（子が誰が・いつ・いくら承認されたかを記録）。
- `tasks.assignee_id`（担当者）と `task_completions.approved_by`（承認者）は `users` への任意 FK であるため、ER 図では主要な関係（creator / child）のみ矢印で表示しています。
- 月次評価（星・コメント）は `rewards` テーブルに統合して管理します。
- 詳細なカラム定義・制約・インデックスは `docs/design/schema.dbml` を参照してください。
