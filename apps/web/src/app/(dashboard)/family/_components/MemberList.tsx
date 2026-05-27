import Link from 'next/link';
import type { GroupMember } from '@fambiz/types';

interface MemberListProps {
  members: GroupMember[];
  groupName: string;
  currentUserRole: string;
}

// ロール名を日本語に変換する
function formatRole(role: string): string {
  if (role === 'parent') return '親';
  if (role === 'child') return '子';
  return role;
}

// 参加日を日本語形式にフォーマットする（Asia/Tokyo タイムゾーンで表示）
function formatJoinedAt(joinedAt: string): string {
  return new Date(joinedAt).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 家族メンバー一覧コンポーネント（Server Component）
export function MemberList({ members, groupName, currentUserRole }: MemberListProps) {
  const isParent = currentUserRole === 'parent';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* グループヘッダーカード */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{groupName}</h3>
            <p className="text-sm text-gray-500 mt-1">
              メンバー数: {members.length}人
            </p>
          </div>

          {/* 親ユーザーのみ招待・脱退ボタンを表示する */}
          {isParent && (
            <div className="flex gap-3">
              <Link
                href="/family/invite"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                招待
              </Link>
              <Link
                href="/family/leave"
                className="px-4 py-2 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
              >
                メンバー脱退
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* メンバー一覧カード */}
      <div className="bg-white rounded-xl shadow-sm border divide-y divide-gray-100">
        {members.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">メンバーがいません。</p>
        ) : (
          members.map((member) => {
            const user = member.user;
            // user が必ず存在する前提だが、型に合わせて安全に処理する
            if (!user) return null;

            // アバターの頭文字（avatar_url がない場合に使用）
            const initials = user.name.charAt(0).toUpperCase();

            return (
              <div key={member.id} className="flex items-start gap-4 p-5">
                {/* アバター（画像または頭文字） */}
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={`${user.name}のアバター`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">{initials}</span>
                    </div>
                  )}
                </div>

                {/* メンバー情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{user.name}</span>
                    {/* ロールバッジ */}
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'parent'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {formatRole(user.role)}
                    </span>
                  </div>

                  {/* コメント（存在する場合のみ表示） */}
                  {user.comment && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{user.comment}</p>
                  )}

                  {/* 参加日 */}
                  <p className="text-xs text-gray-400 mt-1">
                    参加日: {formatJoinedAt(member.joined_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
