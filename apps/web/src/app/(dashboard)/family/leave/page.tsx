import { redirect } from 'next/navigation';
import type { GroupMember, JwtPayload } from '@fambiz/types';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { LeaveGroupForm } from './_components/LeaveGroupForm';

// メンバー脱退ページ（Server Component）
// 親ロールのみアクセス可能
export default async function LeavePage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合はダッシュボードlayout.tsxでリダイレクト済み
  if (!session) {
    return null;
  }

  // JWTペイロードからロール・family_group_id・ユーザーIDを取得する
  let role: string | null = null;
  let familyGroupId: string | null = null;
  const currentUserId = session.user.id;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    role = payload.role ?? null;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as {
      role?: string;
      family_group_id?: string;
    };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
  }

  // 親ロール以外はメニュー画面へリダイレクトする
  if (role !== 'parent') {
    redirect('/');
  }

  // グループ未参加の場合はメニュー画面へリダイレクトする
  if (!familyGroupId) {
    redirect('/');
  }

  // メンバー一覧をAPIから取得する
  const members = await apiFetch<GroupMember[]>(
    `/v1/groups/${familyGroupId}/members`,
  );

  // ログイン中の親自身は選択肢から除外する（APIが400を返すため）
  const removableMembers = members.filter((m) => m.user_id !== currentUserId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">メンバー退会</h2>

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <LeaveGroupForm
          members={removableMembers}
          groupId={familyGroupId}
        />
      </div>
    </div>
  );
}
