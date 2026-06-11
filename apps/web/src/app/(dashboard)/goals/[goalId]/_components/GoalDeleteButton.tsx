'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface GoalDeleteButtonProps {
  goalId: string;
}

// 目標削除ボタンコンポーネント（Client Component）
// 削除確認後にAPIを呼び出し、目標一覧へリダイレクトする
export function GoalDeleteButton({ goalId }: GoalDeleteButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    // 削除確認ダイアログを表示する
    if (!window.confirm('この目標を削除しますか？この操作は元に戻せません。')) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

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

      // DELETE /v1/goals/:id で目標を削除する
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/goals/${goalId}`,
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
              : '目標の削除に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 削除成功後は目標一覧へリダイレクトする
      router.push('/goals');
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1">
      {errorMessage && (
        <p className="text-xs text-red-600 mb-1">{errorMessage}</p>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isLoading}
        className="w-full py-2.5 text-center bg-white text-red-600 font-medium text-sm rounded-lg border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '削除中...' : '削除'}
      </button>
    </div>
  );
}
