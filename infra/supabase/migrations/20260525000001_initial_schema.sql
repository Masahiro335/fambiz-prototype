-- =============================================================================
-- Migration: 初期スキーマ（FamBiz MVP）
-- schema.dbml をもとに生成。Supabase Auth (auth.users) と連携する構成。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM 型定義
-- -----------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('parent', 'child');

CREATE TYPE public.task_status AS ENUM (
  'pending',    -- 未対応
  'reported',   -- 実行報告済み
  'completed',  -- 承認済み・報酬確定
  'cancelled',  -- キャンセル済
  'expired'     -- 期限切れ
);

CREATE TYPE public.goal_status AS ENUM (
  'not_started',      -- 未挑戦
  'in_progress',      -- 挑戦中
  'pending_approval', -- 承認待ち（親が達成判定済み・ボーナス未確定）
  'achieved',         -- 達成済（親が承認済み・ボーナス確定）
  'failed'            -- 未達成
);

CREATE TYPE public.reward_status AS ENUM (
  'pending', -- 未払い（集計中）
  'paid'     -- 支払い完了
);

-- -----------------------------------------------------------------------------
-- updated_at 自動更新トリガー関数
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- users テーブル
-- Supabase Auth の auth.users と id で紐付けるプロフィールテーブル。
-- password_hash は auth.users が管理するため不要（ADR-0003参照）。
-- -----------------------------------------------------------------------------

CREATE TABLE public.users (
  id          uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       varchar(255)  NOT NULL UNIQUE,
  name        varchar(100)  NOT NULL,
  role        public.user_role NOT NULL,
  avatar_url  varchar(512),
  comment     varchar(255),
  deleted_flag boolean      NOT NULL DEFAULT false,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email ON public.users (email);
CREATE INDEX        idx_users_role  ON public.users (role);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- groups テーブル（家族グループ）
-- -----------------------------------------------------------------------------

CREATE TABLE public.groups (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name  varchar(100) NOT NULL,
  invite_code varchar(64)  UNIQUE,
  owner_id    uuid         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  deleted_flag boolean     NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX        idx_groups_owner_id    ON public.groups (owner_id);
CREATE UNIQUE INDEX idx_groups_invite_code ON public.groups (invite_code);

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- group_members テーブル（グループ-ユーザー中間テーブル）
-- -----------------------------------------------------------------------------

CREATE TABLE public.group_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  deleted_flag boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_group_members_group_user ON public.group_members (group_id, user_id);
CREATE INDEX        idx_group_members_user_id    ON public.group_members (user_id);

CREATE TRIGGER trg_group_members_updated_at
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- tasks テーブル（家事タスク）
-- -----------------------------------------------------------------------------

CREATE TABLE public.tasks (
  id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid              NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  creator_id    uuid              NOT NULL REFERENCES public.users(id)  ON DELETE RESTRICT,
  assignee_id   uuid              REFERENCES public.users(id) ON DELETE SET NULL,
  task_name     varchar(150)      NOT NULL,
  category      varchar(50),
  reward_amount integer           NOT NULL DEFAULT 0,
  status        public.task_status NOT NULL DEFAULT 'pending',
  start_time    timestamptz,
  end_time      timestamptz,
  due_date      timestamptz,
  memo          varchar(500),
  deleted_flag  boolean           NOT NULL DEFAULT false,
  created_at    timestamptz       NOT NULL DEFAULT now(),
  updated_at    timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_group_id    ON public.tasks (group_id);
CREATE INDEX idx_tasks_creator_id  ON public.tasks (creator_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks (assignee_id);
CREATE INDEX idx_tasks_status      ON public.tasks (status);
CREATE INDEX idx_tasks_due_date    ON public.tasks (due_date);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- task_completions テーブル（実行報告・承認実績）
-- -----------------------------------------------------------------------------

CREATE TABLE public.task_completions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  child_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reported_at      timestamptz NOT NULL DEFAULT now(),
  approved_by      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at      timestamptz,
  confirmed_reward integer     NOT NULL DEFAULT 0,
  deleted_flag     boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_completions_task_id     ON public.task_completions (task_id);
CREATE INDEX idx_task_completions_child_id    ON public.task_completions (child_id);
CREATE INDEX idx_task_completions_approved_by ON public.task_completions (approved_by);

CREATE TRIGGER trg_task_completions_updated_at
  BEFORE UPDATE ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- goals テーブル（マンスリーゴール）
-- -----------------------------------------------------------------------------

CREATE TABLE public.goals (
  id                 uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id           uuid              NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  creator_id         uuid              NOT NULL REFERENCES public.users(id)  ON DELETE RESTRICT,
  assignee_id        uuid              REFERENCES public.users(id)  ON DELETE SET NULL,
  task_id            uuid              REFERENCES public.tasks(id)  ON DELETE SET NULL,
  goal_name          varchar(150)      NOT NULL,
  goal_reward        integer           NOT NULL DEFAULT 0,
  target_count       integer,
  action             varchar(255),
  and_condition_flag boolean           NOT NULL DEFAULT false,
  status             public.goal_status NOT NULL DEFAULT 'not_started',
  target_month       char(7)           NOT NULL,
  deleted_flag       boolean           NOT NULL DEFAULT false,
  created_at         timestamptz       NOT NULL DEFAULT now(),
  updated_at         timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_group_id     ON public.goals (group_id);
CREATE INDEX idx_goals_creator_id   ON public.goals (creator_id);
CREATE INDEX idx_goals_assignee_id  ON public.goals (assignee_id);
CREATE INDEX idx_goals_task_id      ON public.goals (task_id);
CREATE INDEX idx_goals_target_month ON public.goals (target_month);

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- rewards テーブル（月次報酬集計）
-- -----------------------------------------------------------------------------

CREATE TABLE public.rewards (
  id                  uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid               NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  child_id            uuid               NOT NULL REFERENCES public.users(id)  ON DELETE RESTRICT,
  target_month        char(7)            NOT NULL,
  task_reward_total   integer            NOT NULL DEFAULT 0,
  bonus_reward_total  integer            NOT NULL DEFAULT 0,
  total_amount        integer            NOT NULL DEFAULT 0,
  evaluation_score    smallint,
  evaluation_comment  varchar(500),
  status              public.reward_status NOT NULL DEFAULT 'pending',
  paid_at             timestamptz,
  deleted_flag        boolean            NOT NULL DEFAULT false,
  created_at          timestamptz        NOT NULL DEFAULT now(),
  updated_at          timestamptz        NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_rewards_child_month ON public.rewards (child_id, target_month);
CREATE INDEX        idx_rewards_group_id    ON public.rewards (group_id);
CREATE INDEX        idx_rewards_status      ON public.rewards (status);

CREATE TRIGGER trg_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- auth.users 新規登録時に public.users プロフィールを自動作成するトリガー
-- raw_user_meta_data に name / role を含めてサインアップすることを前提とする。
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'child')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
