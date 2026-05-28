import { redirect } from 'next/navigation';
import type { JwtPayload } from '@fambiz/types';
import { createServerClient } from '@/lib/supabase/server';
import { JoinGroupForm } from './_components/JoinGroupForm';

interface JoinPageProps {
  searchParams: Promise<{ code?: string }>;
}

// 家族グループ参加ページ（Server Component）
// QRコードスキャン後に表示され、グループ情報確認・参加処理を行う
export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { code } = await searchParams;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合はログイン画面へリダイレクトする
  if (!session) {
    redirect('/login');
  }

  // 招待コードが指定されていない場合は家族管理ページへリダイレクトする
  if (!code) {
    redirect('/family');
  }

  // JWTペイロードからfamily_group_idを取得する
  let familyGroupId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as {
      family_group_id?: string;
    };
    familyGroupId = metadata.family_group_id ?? null;
  }

  // 既にグループに参加済みの場合は家族管理ページへリダイレクトする
  if (familyGroupId) {
    redirect('/family');
  }

  // 招待コードでグループ情報をSupabaseから取得する
  const { data: groupData } = await supabase
    .from('groups')
    .select('id, group_name')
    .eq('invite_code', code)
    .eq('deleted_flag', false)
    .single();

  // グループが見つからない場合は無効な招待コードとして表示する
  if (!groupData) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">グループに参加する</h2>
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
          <p className="text-red-600 font-medium mb-2">招待コードが無効です</p>
          <p className="text-sm text-gray-500">
            この招待コードは無効または期限切れです。招待者に再度QRコードを発行してもらってください。
          </p>
        </div>
      </div>
    );
  }

  // メンバー数をSupabaseから取得する
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupData.id)
    .eq('deleted_flag', false);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">グループに参加する</h2>

      {/* グループ情報カード */}
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <p className="text-sm text-gray-500 mb-4">
          以下のグループへの参加リクエストを確認してください。
        </p>

        {/* グループ名 */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">グループ名</p>
          <p className="text-xl font-bold text-gray-800">{groupData.group_name}</p>
        </div>

        {/* メンバー数 */}
        <div className="mb-6 bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">現在のメンバー数</p>
          <p className="text-gray-700 font-medium">{memberCount ?? 0} 人</p>
        </div>

        {/* 参加フォーム（インタラクション部分はClient Component） */}
        <JoinGroupForm inviteCode={code} groupName={groupData.group_name} />
      </div>
    </div>
  );
}
