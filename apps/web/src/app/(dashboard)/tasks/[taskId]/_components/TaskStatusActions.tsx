'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus } from '@fambiz/types';

interface TaskStatusActionsProps {
  task: Task;
  role: string | null;
}

// タスクステータス変更アクションコンポーネント（Client Component）
// ロールとステータスに応じてアクションボタンを表示する
export function TaskStatusActions({ task, role }: TaskStatusActionsProps) {
  const router = useRouter();

  // 差し戻しコメント入力の表示フラグ
  const [showRejectComment, setShowRejectComment] = useState(false);
  // 差し戻しコメント（任意入力）
  const [rejectComment, setRejectComment] = useState('');
  // ローディング状態
  const [isLoading, setIsLoading] = useState(false);
  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ステータス変更APIを呼び出す共通ハンドラ
  async function handleStatusChange(status: TaskStatus, comment?: string) {
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

      // リクエストボディを組み立てる
      const requestBody: { status: TaskStatus; comment?: string } = { status };
      if (comment?.trim()) {
        requestBody.comment = comment.trim();
      }

      // PATCH /v1/tasks/:id/status でステータスを更新する
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/tasks/${task.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
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

      // 成功後はタスク一覧へ遷移してキャッシュを更新する
      router.push('/tasks');
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  // 「対応済にする」ボタンのハンドラ（子のみ・pending時）
  async function handleReport() {
    await handleStatusChange('reported');
  }

  // 「取り下げる」ボタンのハンドラ（子のみ・pending/reported時）
  async function handleCancel() {
    if (!window.confirm('このタスクを取り下げますか？')) return;
    await handleStatusChange('cancelled');
  }

  // 「承認する」ボタンのハンドラ（親のみ・reported時）
  async function handleApprove() {
    await handleStatusChange('completed');
  }

  // 「差し戻す」ボタンのハンドラ（親のみ・reported時）
  async function handleReject() {
    await handleStatusChange('pending', rejectComment);
    setShowRejectComment(false);
    setRejectComment('');
  }

  // 表示するボタンがない場合はnullを返す
  const isChild = role === 'child';
  const isParent = role === 'parent';
  const isPending = task.status === 'pending';
  const isReported = task.status === 'reported';

  const hasChildActions = isChild && (isPending || isReported);
  const hasParentActions = isParent && isReported;

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
          {/* pending の場合のみ「対応済にする」ボタンを表示 */}
          {isPending && (
            <button
              type="button"
              onClick={handleReport}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '更新中...' : '対応済にする'}
            </button>
          )}

          {/* pending または reported の場合「取り下げる」ボタンを表示 */}
          {(isPending || isReported) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full py-3 bg-white text-red-600 font-semibold rounded-lg border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取り下げる
            </button>
          )}
        </div>
      )}

      {/* 親ユーザー向けアクション（reported 時のみ） */}
      {isParent && isReported && (
        <div className="flex flex-col gap-3">
          {/* 「承認する」ボタン */}
          <button
            type="button"
            onClick={handleApprove}
            disabled={isLoading}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '更新中...' : '承認する'}
          </button>

          {/* 差し戻しコメント入力エリア（「差し戻す」ボタン押下後に表示） */}
          {showRejectComment ? (
            <div className="space-y-2">
              <label
                htmlFor="rejectComment"
                className="block text-sm font-medium text-gray-700"
              >
                差し戻し理由（任意）
              </label>
              <textarea
                id="rejectComment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="差し戻し理由があれば入力してください"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '更新中...' : '差し戻す'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectComment(false);
                    setRejectComment('');
                  }}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRejectComment(true)}
              disabled={isLoading}
              className="w-full py-3 bg-white text-orange-600 font-semibold rounded-lg border border-orange-300 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              差し戻す
            </button>
          )}
        </div>
      )}
    </div>
  );
}
