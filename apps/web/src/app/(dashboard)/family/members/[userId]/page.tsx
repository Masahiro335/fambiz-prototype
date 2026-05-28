import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import type { GroupMember, JwtPayload } from '@fambiz/types';

interface MemberDetailPageProps {
  params: Promise<{ userId: string }>;
}

// メンバー詳細ページ（Server Component）
export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { userId } = await params;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合はnullを返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからロールとfamily_group_idを取得する
  let currentUserRole: string | null = null;
  let familyGroupId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    currentUserRole = payload.role ?? null;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as {
      role?: string;
      family_group_id?: string;
    };
    currentUserRole = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
  }

  // グループに所属していない場合は一覧へリダイレクトする
  if (!familyGroupId) {
    redirect('/family');
  }

  // メンバー詳細を取得する
  const member = await apiFetch<GroupMember>(
    `/v1/groups/${familyGroupId}/members/${userId}`,
  );

  const user = member.user;

  // アバターの頭文字（avatar_url がない場合に使用）
  const initials = user ? user.name.charAt(0).toUpperCase() : '?';

  // 閲覧者が親の場合は子の詳細ビュー（報酬テーブルあり）、子の場合は親の簡易ビューを表示する
  const isViewerParent = currentUserRole === 'parent';

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">メンバー詳細</h2>

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        {/* アバター */}
        <div className="flex justify-center mb-4">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={`${user.name}のアバター`}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-3xl">{initials}</span>
            </div>
          )}
        </div>

        {/* 名前 */}
        <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
          {user?.name ?? '-'}
        </h3>

        {/* コメント */}
        {user?.comment && (
          <p className="text-sm text-center text-gray-500 mb-4">
            コメント: {user.comment}
          </p>
        )}

        {/* 閲覧者が親の場合のみ報酬・目標テーブルを表示する（子の情報を親が確認） */}
        {isViewerParent && (
          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">報酬額</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">目標達成率</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">年月</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* 報酬・目標APIは未実装のためプレースホルダーを表示する */}
                  <td className="px-4 py-3 text-gray-400">-</td>
                  <td className="px-4 py-3 text-gray-400">-</td>
                  <td className="px-4 py-3 text-gray-400">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 閉じるボタン（家族一覧へ戻る） */}
        <div className="flex justify-center">
          <Link
            href="/family"
            className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            閉じる
          </Link>
        </div>
      </div>
    </div>
  );
}
