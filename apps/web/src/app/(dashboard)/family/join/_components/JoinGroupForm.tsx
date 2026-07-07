'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface JoinGroupFormProps {
  inviteCode: string;
  groupName: string;
}

// グループ参加フォームコンポーネント（Client Component）
// 「参加する」「キャンセル」ボタンのインタラクションを担当する
export function JoinGroupForm({ inviteCode, groupName }: JoinGroupFormProps) {
  const router = useRouter();

  // UI状態
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // グループ参加フォームの送信ハンドラ
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

      // POST /v1/groups/join でグループに参加する
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteCode }),
      });

      if (!res.ok) {
        const errorBody = (await res.json()) as { message?: string | string[] };
        const message: string =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : Array.isArray(errorBody.message)
              ? errorBody.message.join(' ')
              : '参加に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // JWTに family_group_id を反映させるためトークンをリフレッシュしてからリダイレクトする
      await supabase.auth.refreshSession();
      router.push('/family');
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

      <div className="flex gap-3">
        {/* 参加ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '参加中...' : `「${groupName}」に参加する`}
        </button>

        {/* キャンセルボタン */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => router.push('/family')}
          className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
