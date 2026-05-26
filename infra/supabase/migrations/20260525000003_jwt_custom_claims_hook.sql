-- =============================================================================
-- Migration: JWT カスタムクレーム Database Hook
-- Supabase Auth のサインイン時に role / family_group_id を JWT へ追加する。
-- config.toml の [auth.hook.custom_access_token] で有効化済み（ADR-0003参照）。
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims          jsonb;
  _user_role      text;
  _family_group_id uuid;
BEGIN
  -- public.users からユーザーのロールを取得
  SELECT role::text INTO _user_role
  FROM public.users
  WHERE id = (event ->> 'user_id')::uuid
    AND deleted_flag = false;

  -- group_members から所属グループIDを取得（参加日時が最も古いグループを優先）
  SELECT group_id INTO _family_group_id
  FROM public.group_members
  WHERE user_id = (event ->> 'user_id')::uuid
    AND deleted_flag = false
  ORDER BY joined_at ASC
  LIMIT 1;

  claims := event -> 'claims';

  IF _user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(_user_role));
  END IF;

  IF _family_group_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{family_group_id}', to_jsonb(_family_group_id::text));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- supabase_auth_admin に実行権限を付与（Hook 呼び出しに必要）
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- 一般ロールからの直接呼び出しを禁止
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, authenticated, anon;
