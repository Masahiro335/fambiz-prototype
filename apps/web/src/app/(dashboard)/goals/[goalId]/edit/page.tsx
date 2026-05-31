import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { EditGoalForm } from './_components/EditGoalForm';
import type { Goal, GroupMember, JwtPayload } from '@fambiz/types';

// 目標編集ページ（Server Component）
// 親ユーザーのみアクセス可能。子がアクセスした場合は目標一覧へリダイレクトする。
export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ミドルウェアでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからロールと家族グループIDを取得する
  let role: string | null = null;
  let familyGroupId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    role = payload.role ?? null;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as { role?: string; family_group_id?: string };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
  }

  // 子ユーザーは目標一覧へリダイレクトする
  if (role === 'child') {
    redirect('/goals');
  }

  // グループ未参加の場合は目標一覧へリダイレクトする
  if (!familyGroupId) {
    redirect('/goals');
  }

  // 編集対象の目標を取得する
  let goal: Goal | null = null;
  try {
    goal = await apiFetch<Goal>(`/v1/goals/${goalId}`);
  } catch {
    redirect('/goals');
  }

  if (!goal) {
    redirect('/goals');
  }

  // 担当者（子）の選択肢として家族メンバーを取得する
  let members: GroupMember[] = [];
  try {
    members = await apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`);
  } catch {
    members = [];
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">目標を編集</h2>
      <EditGoalForm goal={goal} members={members} />
    </div>
  );
}
