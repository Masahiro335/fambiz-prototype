'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Goal, GoalStatus } from '@fambiz/types';

interface GoalStatusActionsProps {
  goal: Goal;
  role: string | null;
}

// 目標ステータス変更アクションコンポーネント（Client Component）
// ロールとステータスに応じてアクションボタンを表示する
export function GoalStatusActions({ goal, role }: GoalStatusActionsProps) {
  const router = useRouter();
  // ローディング状態
  const [isLoading, setIsLoading] = useState(false);
  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ステータス変更APIを呼び出す共通ハンドラ
  async function handleStatusChange(status: GoalStatus) {
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

      // PATCH /v1/goals/:id/status でステータスを更新する
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/goals/${goal.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!res.ok) {
        const errorBody = (await res.json()) as { message?: string | string[] };
        const message: string =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : Array.isArray(errorBody.message)
              ? errorBody.message.join(' ')
              : 'ステータスの更新に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 成功後はページを再取得して最新状態を反映する
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  const isChild = role === 'child';
  const isParent = role === 'parent';
  const isNotStarted = goal.status === 'not_started';
  const isInProgress = goal.status === 'in_progress';
  const isPendingApproval = goal.status === 'pending_approval';

  // 表示するボタンがない場合はnullを返す
  const hasChildActions = isChild && (isNotStarted || isInProgress);
  const hasParentActions = isParent && isPendingApproval;

  if (!hasChildActions && !hasParentActions) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      {/* エラーメッセージ表示エリア */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* 子ユーザー向けアクション */}
      {isChild && (
        <div className="flex flex-col gap-3">
          {/* not_started の場合のみ「挑戦する」ボタンを表示 */}
          {isNotStarted && (
            <button
              type="button"
              onClick={() => handleStatusChange('in_progress')}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '更新中...' : '挑戦する'}
            </button>
          )}

          {/* in_progress の場合のみ「達成報告する」ボタンを表示 */}
          {isInProgress && (
            <button
              type="button"
              onClick={() => handleStatusChange('pending_approval')}
              disabled={isLoading}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '更新中...' : '達成報告する'}
            </button>
          )}
        </div>
      )}

      {/* 親ユーザー向けアクション（pending_approval 時のみ） */}
      {isParent && isPendingApproval && (
        <div className="flex flex-col gap-3">
          {/* 「達成承認」ボタン */}
          <button
            type="button"
            onClick={() => handleStatusChange('achieved')}
            disabled={isLoading}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '更新中...' : '達成承認'}
          </button>

          {/* 「未達成にする」ボタン */}
          <button
            type="button"
            onClick={() => handleStatusChange('failed')}
            disabled={isLoading}
            className="w-full py-3 bg-white text-red-600 font-semibold rounded-lg border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '更新中...' : '未達成にする'}
          </button>
        </div>
      )}
    </div>
  );
}
