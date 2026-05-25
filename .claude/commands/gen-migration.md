# /gen-migration

**引数**: `$ARGUMENTS`（マイグレーション名、例: `add_task_completions_table`、`add_goals_bonus_column`）

`docs/design/schema.dbml` を参照しながら、Supabase マイグレーションファイルをサブエージェントで生成します。

---

## 実行手順

1. `docs/design/schema.dbml` でデータモデルを確認する
2. `infra/supabase/migrations/` 配下の既存マイグレーションファイルを確認し、最新のタイムスタンプを把握する
3. **Agent ツールでサブエージェントを起動**してマイグレーションを生成させる

---

### サブエージェント: マイグレーション生成

プロンプト例:
```
FamBiz の Supabase マイグレーションファイルを生成してください。

マイグレーション名: <引数の名前>
参照ファイル:
- docs/design/schema.dbml（データモデル定義）
- infra/supabase/migrations/（既存マイグレーション）

生成するファイル:
- パス: infra/supabase/migrations/<YYYYMMDDHHMMSS>_<名前>.sql
  （タイムスタンプは既存の最新ファイル名の次の値を使用）

SQLの内容（以下を必ず含める）:
1. CREATE TABLE / ALTER TABLE 文
   - UUID型の id カラム（PRIMARY KEY DEFAULT gen_random_uuid()）
   - family_group_id カラム（UUID, NOT NULL）
   - created_at / updated_at（TIMESTAMPTZ, DEFAULT NOW()）
   - schema.dbml で定義された全カラム

2. インデックス
   - family_group_id へのインデックス（必須）
   - status / created_at など検索頻度の高いカラムにインデックス

3. RLS（Row Level Security）ポリシー
   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
   - SELECT ポリシー: family_group_id が JWT クレームの family_group_id と一致するもの
   - INSERT ポリシー: 同上
   - UPDATE ポリシー: 同上（子は自分のレコードのみ / 親は全体）
   - DELETE ポリシー: 親のみ

4. ロールバック用コメント（末尾）
   -- rollback: DROP TABLE <table_name>;
```

---

## 完了後の確認

1. 生成されたSQLをレビューして問題がないか確認する
2. `infra/supabase/seed/` にシードデータの追加が必要か判断する
3. `docs/design/schema.dbml` との差分がないか最終確認する
4. 実行コマンドを提示する:
   ```bash
   pnpm supabase db push
   ```
