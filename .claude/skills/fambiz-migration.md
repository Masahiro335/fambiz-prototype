# fambiz-migration

Supabase マイグレーション SQL の生成パターン。`infra/supabase/migrations/` に配置する。

## 使用タイミング

- 新しいテーブルを追加するとき
- カラムの追加・変更・削除を行うとき
- `/gen-migration` コマンドのサブエージェントから参照するとき

---

## ファイル命名規則

```
infra/supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql

例:
20260525000001_initial_schema.sql
20260601120000_add_task_categories_table.sql
20260615090000_add_goals_bonus_column.sql
```

タイムスタンプは既存の最新ファイルの次の値を使用する。

---

## 新テーブル作成テンプレート

```sql
-- =============================================================================
-- Migration: <テーブル名> テーブル追加
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.<table_name> (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,

  -- ドメイン固有カラム
  <column_name>   <type>      NOT NULL,
  <column_name>   <type>,                -- NULL許容の場合

  deleted_flag    BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス（group_id は必須、検索頻度の高いカラムにも付与）
CREATE INDEX idx_<table_name>_group_id ON public.<table_name>(group_id);
CREATE INDEX idx_<table_name>_<column> ON public.<table_name>(<column>);

-- updated_at の自動更新トリガー
CREATE TRIGGER update_<table_name>_updated_at
  BEFORE UPDATE ON public.<table_name>
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 有効化（必須）
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS ポリシー
-- =============================================================================

-- 自グループのデータのみ参照可能
CREATE POLICY "<table_name>_select_own_group"
  ON public.<table_name> FOR SELECT
  USING (group_id = public.get_family_group_id());

-- 親のみ作成可能（子も作成可能な場合は条件を調整）
CREATE POLICY "<table_name>_insert_parent"
  ON public.<table_name> FOR INSERT
  WITH CHECK (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

-- 親のみ更新可能
CREATE POLICY "<table_name>_update_parent"
  ON public.<table_name> FOR UPDATE
  USING (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

-- 親のみ削除可能
CREATE POLICY "<table_name>_delete_parent"
  ON public.<table_name> FOR DELETE
  USING (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

-- rollback: DROP TABLE public.<table_name>;
```

---

## カラム追加テンプレート

```sql
-- =============================================================================
-- Migration: <table_name> テーブルに <column_name> カラムを追加
-- =============================================================================

ALTER TABLE public.<table_name>
  ADD COLUMN IF NOT EXISTS <column_name> <type> [NOT NULL] [DEFAULT <value>];

-- rollback: ALTER TABLE public.<table_name> DROP COLUMN <column_name>;
```

---

## RLS ポリシーの子ロール対応（子が INSERT できるテーブル）

`task_completions` のように子が作成するテーブルのポリシー例:

```sql
-- 子のみ作成可能（自分のIDで作成）
CREATE POLICY "<table_name>_insert_child"
  ON public.<table_name> FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'child'
    AND child_id = auth.uid()
    AND <parent_table>_id IN (
      SELECT id FROM public.<parent_table>
      WHERE group_id = public.get_family_group_id()
        AND deleted_flag = false
    )
  );
```

---

## ヘルパー関数（既存・変更不要）

RLS ポリシーで使用するヘルパー関数は `20260525000002_rls_policies.sql` で定義済み。

| 関数 | 戻り値 | 説明 |
|------|--------|------|
| `public.get_family_group_id()` | `uuid` | JWTクレームから `family_group_id` を取得 |
| `public.get_user_role()` | `text` | JWTクレームから `role` を取得（`'parent'` / `'child'`） |

---

## チェックリスト

- [ ] `id` は `UUID DEFAULT gen_random_uuid()`
- [ ] `group_id` カラムあり（`NOT NULL`・`groups(id)` への外部キー）
- [ ] `deleted_flag` カラムあり（論理削除）
- [ ] `created_at` / `updated_at` は `TIMESTAMPTZ DEFAULT NOW()`
- [ ] `group_id` へのインデックスあり
- [ ] `updated_at` 自動更新トリガーあり
- [ ] `ENABLE ROW LEVEL SECURITY` あり
- [ ] SELECT / INSERT / UPDATE / DELETE の RLS ポリシーを網羅
- [ ] ファイル末尾にロールバック用コメントあり

---

## 実行コマンド

```bash
# ローカル DB に適用
pnpm supabase db push

# マイグレーション状態確認
pnpm supabase migration list
```
