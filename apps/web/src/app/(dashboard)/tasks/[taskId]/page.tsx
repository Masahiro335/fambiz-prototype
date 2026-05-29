import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { TaskStatusActions } from './_components/TaskStatusActions';
import type { Task, TaskStatus, JwtPayload } from '@fambiz/types';

// ステータスのラベルとカラークラスを定義する
const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: {
    label: '未対応',
    className: 'bg-gray-100 text-gray-600',
  },
  reported: {
    label: '対応済',
    className: 'bg-blue-100 text-blue-600',
  },
  completed: {
    label: '完了',
    className: 'bg-green-100 text-green-600',
  },
  cancelled: {
    label: 'キャンセル',
    className: 'bg-red-100 text-red-600',
  },
  expired: {
    label: '期限切れ',
    className: 'bg-red-100 text-red-600',
  },
};

// タスク詳細ページ（Server Component）
export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからロールと家族グループIDを取得する
  let role: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    role = payload.role ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as { role?: string };
    role = metadata.role ?? null;
  }

  // タスク詳細を取得する
  let task: Task | null = null;
  try {
    task = await apiFetch<Task>(`/v1/tasks/${taskId}`);
  } catch {
    // タスクが取得できない場合はタスク一覧へリダイレクトする
    redirect('/tasks');
  }

  if (!task) {
    redirect('/tasks');
  }

  const status = statusConfig[task.status] ?? { label: task.status, className: 'bg-gray-100 text-gray-600' };

  return (
    <div className="max-w-2xl">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">タスク詳細</h2>
        <Link
          href="/tasks"
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          ← 戻る
        </Link>
      </div>

      {/* タスク詳細カード */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        {/* タスク名とステータスバッジ */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-800">{task.task_name}</h3>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* 詳細情報リスト */}
        <dl className="divide-y divide-gray-100">
          {/* 分類 */}
          {task.category && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">分類</dt>
              <dd className="text-sm text-gray-800">{task.category}</dd>
            </div>
          )}

          {/* 報酬 */}
          <div className="py-3 flex items-center justify-between">
            <dt className="text-sm font-medium text-gray-500">報酬</dt>
            <dd className="text-sm font-semibold text-gray-800">
              {task.reward_amount.toLocaleString()}円
            </dd>
          </div>

          {/* 開始日時 */}
          {task.start_time && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">開始日時</dt>
              <dd className="text-sm text-gray-800">
                {new Date(task.start_time).toLocaleDateString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
          )}

          {/* 終了日時 */}
          {task.end_time && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">終了日時</dt>
              <dd className="text-sm text-gray-800">
                {new Date(task.end_time).toLocaleDateString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
          )}

          {/* 期日 */}
          {task.due_date && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">期日</dt>
              <dd className="text-sm text-gray-800">
                {new Date(task.due_date).toLocaleDateString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
          )}

          {/* 登録日時 */}
          <div className="py-3 flex items-center justify-between">
            <dt className="text-sm font-medium text-gray-500">登録日時</dt>
            <dd className="text-sm text-gray-800">
              {new Date(task.created_at).toLocaleDateString('ja-JP', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
        </dl>

        {/* メモ */}
        {task.memo && (
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">メモ</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
              {task.memo}
            </p>
          </div>
        )}

        {/* 親ユーザー向け編集・削除リンク */}
        {role === 'parent' && (
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Link
              href={`/tasks/${task.id}/edit`}
              className="flex-1 py-2.5 text-center bg-white text-blue-600 font-medium text-sm rounded-lg border border-blue-300 hover:bg-blue-50 transition-colors"
            >
              編集
            </Link>
          </div>
        )}
      </div>

      {/* ステータス変更アクションボタン（Client Component） */}
      <TaskStatusActions task={task} role={role} />
    </div>
  );
}
