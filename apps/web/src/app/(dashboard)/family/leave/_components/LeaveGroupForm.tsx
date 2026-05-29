'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GroupMember } from '@fambiz/types';
import { createClient } from '@/lib/supabase/client';

interface LeaveGroupFormProps {
  members: GroupMember[];
  groupId: string;
}

// メンバー脱退フォームコンポーネント（Client Component）
// ラジオボタンでメンバーを選択し、脱退APIを呼び出す
export function LeaveGroupForm({ members, groupId }: LeaveGroupFormProps) {
  const router = useRouter();

  // 選択中のメンバーのuser_id
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // フォーム送信ハンドラ（選択メンバーの脱退APIを呼び出す）
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUserId) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      // ブラウザ側でSupabaseセッションを取得しアクセストークンを付与する
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('セッションが無効です。再ログインしてください。');
        return;
      }

      // DELETE /v1/groups/{groupId}/members/{userId} でメンバーを脱退させる
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/groups/${groupId}/members/${selectedUserId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!res.ok) {
        const errorBody = (await res.json()) as { message?: string | string[] };
        const message: string =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : Array.isArray(errorBody.message)
              ? errorBody.message.join(' ')
              : '脱退処理に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 成功後は家族管理画面へリダイレクトする
      router.push('/family');
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* エラーメッセージ表示エリア */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* 脱退対象メンバーの選択リスト */}
      {members.length === 0 ? (
        <p className="text-sm text-gray-500 mb-6">脱退できるメンバーがいません。</p>
      ) : (
        <div className="space-y-2 mb-6">
          {members.map((member) => {
            const user = member.user;
            // アバターの頭文字（avatar_url がない場合に使用）
            const displayName = user?.name ?? member.user_id;
            const initials = displayName.charAt(0).toUpperCase();
            const isSelected = selectedUserId === member.user_id;

            return (
              <label
                key={member.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {/* ラジオボタン */}
                <input
                  type="radio"
                  name="member"
                  value={member.user_id}
                  checked={isSelected}
                  onChange={() => setSelectedUserId(member.user_id)}
                  className="accent-blue-600"
                  disabled={isLoading}
                />

                {/* アバター（画像または頭文字） */}
                <div className="flex-shrink-0">
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={`${displayName}のアバター`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">{initials}</span>
                    </div>
                  )}
                </div>

                {/* メンバー名とロール */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{displayName}</p>
                  {user?.role && (
                    <p className="text-xs text-gray-500">
                      {user.role === 'parent' ? '親' : '子'}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* 登録ボタン */}
      <button
        type="submit"
        disabled={!selectedUserId || isLoading}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '処理中...' : '登録'}
      </button>
    </form>
  );
}
