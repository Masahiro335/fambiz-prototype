import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { CreateTaskForm } from '../_components/CreateTaskForm';
import { getPaidMonths } from '../_lib/getPaidMonths';
import type { GroupMember, JwtPayload } from '@fambiz/types';

// タスク新規登録ページ（Server Component）
// 親ユーザーのみアクセス可能。childがアクセスした場合はタスク一覧へリダイレクトする。
export default async function NewTaskPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
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

  // childの場合はタスク一覧へリダイレクトする
  if (role === 'child') {
    redirect('/tasks');
  }

  // グループ未参加の場合はタスク一覧へリダイレクトする
  if (!familyGroupId) {
    redirect('/tasks');
  }

  const paidMonths = await getPaidMonths(familyGroupId);

  // 担当者（子）の選択肢として家族メンバーを取得する
  let members: GroupMember[] = [];
  try {
    members = await apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`);
  } catch {
    members = [];
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">タスクを登録</h2>
      <CreateTaskForm groupId={familyGroupId} paidMonths={paidMonths} members={members} />
    </div>
  );
}
