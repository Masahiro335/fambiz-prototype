import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import type { GroupMember, JwtPayload } from '@fambiz/types';
import { apiFetch } from '@/lib/api/fetcher';
import { CreateGroupForm } from './_components/CreateGroupForm';
import { MemberList } from './_components/MemberList';

// 家族グループ管理ページ（Server Component）
export default async function FamilyPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからユーザーのロールとfamily_group_idを取得する
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
    const metadata = session.user.user_metadata as {
      role?: string;
      family_group_id?: string;
    };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
  }

  // グループ参加済みの場合はメンバー一覧とグループ名を並列取得する
  let members: GroupMember[] = [];
  let groupName = '家族グループ';

  if (familyGroupId) {
    try {
      // メンバー一覧APIとSupabaseのグループ名クエリを並列で実行する
      const [fetchedMembers, groupResult] = await Promise.all([
        apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`),
        supabase.from('groups').select('group_name').eq('id', familyGroupId).single(),
      ]);

      members = fetchedMembers;

      // グループ名が取得できた場合は上書き、失敗時はフォールバック値を維持する
      if (groupResult.data?.group_name) {
        groupName = groupResult.data.group_name;
      }
    } catch {
      // 脱退済みなどでAPIが403を返した場合はメニュー画面へリダイレクトする
      redirect('/');
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">家族管理</h2>

      {familyGroupId ? (
        // グループ参加済みの場合はメンバー一覧を表示する
        <MemberList
          members={members}
          groupName={groupName}
          currentUserRole={role ?? 'child'}
        />
      ) : role === 'parent' ? (
        // グループ未所属の親ユーザーにグループ作成フォームを表示する
        <CreateGroupForm />
      ) : (
        // グループ未所属の子ユーザーにメッセージを表示する
        <div className="bg-white rounded-xl shadow-sm border p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a4 4 0 00-5.656-3.657M9 20H4v-2a4 4 0 015.656-3.657M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0zm-18 0a3 3 0 116 0 3 3 0 01-6 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            まだ家族グループに参加していません
          </h3>
          <p className="text-sm text-gray-500">
            親から送られた招待URLを使ってグループに参加しましょう。
          </p>
        </div>
      )}
    </div>
  );
}
