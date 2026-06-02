import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { CreateGoalForm } from '../_components/CreateGoalForm';
import type { GroupMember, JwtPayload } from '@fambiz/types';

// JST（UTC+9）の現在月を YYYY-MM 形式で返す
function getDefaultMonth(): string {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 目標新規登録ページ（Server Component）
// 親ユーザーのみアクセス可能。子がアクセスした場合は目標一覧へリダイレクトする。
export default async function NewGoalPage() {
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

  // 担当者（子）の選択肢として家族メンバーを取得する
  let members: GroupMember[] = [];
  try {
    members = await apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`);
  } catch {
    members = [];
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">目標を登録</h2>
      <CreateGoalForm
        groupId={familyGroupId}
        members={members}
        defaultMonth={getDefaultMonth()}
      />
    </div>
  );
}
