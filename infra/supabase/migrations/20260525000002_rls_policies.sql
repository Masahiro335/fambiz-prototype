-- =============================================================================
-- Migration: RLS ポリシー設定
-- 家族グループ間のデータ分離を保証する（CLAUDE.md 業務ルール #2 参照）。
-- NestJS 側の family_group_id フィルタと二重でチェックする。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 全テーブルで RLS を有効化
-- -----------------------------------------------------------------------------

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards       ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ヘルパー関数
-- JWT カスタムクレームから値を取り出す（ADR-0003 参照）
-- -----------------------------------------------------------------------------

-- JWTから所属グループIDを取得
CREATE OR REPLACE FUNCTION public.get_family_group_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() ->> 'family_group_id')::uuid;
$$;

-- JWTからユーザーロールを取得
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT auth.jwt() ->> 'role';
$$;

-- -----------------------------------------------------------------------------
-- users ポリシー
-- -----------------------------------------------------------------------------

-- 自分自身のプロフィールを参照可能
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- 同じ家族グループのメンバーも参照可能
CREATE POLICY "users_select_same_group"
  ON public.users FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM public.group_members
      WHERE group_id = public.get_family_group_id()
        AND deleted_flag = false
    )
  );

-- 自分自身のプロフィールのみ更新可能
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- groups ポリシー
-- -----------------------------------------------------------------------------

-- 自分が所属するグループのみ参照可能
CREATE POLICY "groups_select_own"
  ON public.groups FOR SELECT
  USING (id = public.get_family_group_id());

-- 親ユーザーのみグループを作成可能
CREATE POLICY "groups_insert_parent"
  ON public.groups FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'parent'
    AND owner_id = auth.uid()
  );

-- グループオーナー（親）のみ更新可能
CREATE POLICY "groups_update_owner"
  ON public.groups FOR UPDATE
  USING (
    id = public.get_family_group_id()
    AND owner_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- group_members ポリシー
-- -----------------------------------------------------------------------------

CREATE POLICY "group_members_select_own_group"
  ON public.group_members FOR SELECT
  USING (group_id = public.get_family_group_id());

CREATE POLICY "group_members_insert_own_group"
  ON public.group_members FOR INSERT
  WITH CHECK (group_id = public.get_family_group_id());

CREATE POLICY "group_members_update_own_group"
  ON public.group_members FOR UPDATE
  USING (group_id = public.get_family_group_id());

-- 自分自身の脱退 または 親による除名
CREATE POLICY "group_members_delete_own_group"
  ON public.group_members FOR DELETE
  USING (
    group_id = public.get_family_group_id()
    AND (user_id = auth.uid() OR public.get_user_role() = 'parent')
  );

-- -----------------------------------------------------------------------------
-- tasks ポリシー
-- group_id による家族グループ分離（CLAUDE.md 業務ルール #2）
-- -----------------------------------------------------------------------------

CREATE POLICY "tasks_select_own_group"
  ON public.tasks FOR SELECT
  USING (group_id = public.get_family_group_id());

-- タスク登録・編集・削除は親のみ（CLAUDE.md 業務ルール #1）
CREATE POLICY "tasks_insert_parent"
  ON public.tasks FOR INSERT
  WITH CHECK (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
    AND creator_id = auth.uid()
  );

CREATE POLICY "tasks_update_parent"
  ON public.tasks FOR UPDATE
  USING (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

CREATE POLICY "tasks_delete_parent"
  ON public.tasks FOR DELETE
  USING (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

-- -----------------------------------------------------------------------------
-- task_completions ポリシー
-- -----------------------------------------------------------------------------

-- 自分のグループのタスクに紐づく実績のみ参照可能
CREATE POLICY "task_completions_select_own_group"
  ON public.task_completions FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM public.tasks
      WHERE group_id = public.get_family_group_id()
        AND deleted_flag = false
    )
  );

-- 実行報告は子のみ作成可能
CREATE POLICY "task_completions_insert_child"
  ON public.task_completions FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'child'
    AND child_id = auth.uid()
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE group_id = public.get_family_group_id()
        AND deleted_flag = false
    )
  );

-- 承認（approved_by / approved_at の更新）は親のみ可能
CREATE POLICY "task_completions_update_parent"
  ON public.task_completions FOR UPDATE
  USING (
    public.get_user_role() = 'parent'
    AND task_id IN (
      SELECT id FROM public.tasks
      WHERE group_id = public.get_family_group_id()
        AND deleted_flag = false
    )
  );

-- -----------------------------------------------------------------------------
-- goals ポリシー
-- -----------------------------------------------------------------------------

CREATE POLICY "goals_select_own_group"
  ON public.goals FOR SELECT
  USING (group_id = public.get_family_group_id());

-- 目標の作成・更新・削除は親のみ
CREATE POLICY "goals_insert_parent"
  ON public.goals FOR INSERT
  WITH CHECK (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
    AND creator_id = auth.uid()
  );

CREATE POLICY "goals_update_parent"
  ON public.goals FOR UPDATE
  USING (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

CREATE POLICY "goals_delete_parent"
  ON public.goals FOR DELETE
  USING (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

-- -----------------------------------------------------------------------------
-- rewards ポリシー
-- -----------------------------------------------------------------------------

CREATE POLICY "rewards_select_own_group"
  ON public.rewards FOR SELECT
  USING (group_id = public.get_family_group_id());

-- 月次報酬の作成・更新・支払い完了は親のみ
CREATE POLICY "rewards_insert_parent"
  ON public.rewards FOR INSERT
  WITH CHECK (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );

CREATE POLICY "rewards_update_parent"
  ON public.rewards FOR UPDATE
  USING (
    group_id = public.get_family_group_id()
    AND public.get_user_role() = 'parent'
  );
