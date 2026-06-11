'use client';

import Link from 'next/link';
import type { Task, TaskStatus } from '@fambiz/types';

interface TaskCardProps {
  task: Task;
  /** 親ユーザーの場合に渡す編集ページへのリンクURL */
  editHref?: string;
}

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
    className: 'bg-gray-100 text-gray-500',
  },
  expired: {
    label: '期限切れ',
    className: 'bg-red-100 text-red-600',
  },
};

// 分類のカラークラスを定義する
const categoryConfig: Record<string, { className: string }> = {
  掃除: { className: 'bg-blue-100 text-blue-700' },
  料理: { className: 'bg-red-100 text-red-700' },
  洗濯: { className: 'bg-yellow-100 text-yellow-700' },
  その他: { className: 'bg-green-100 text-green-700' },
};

// タスクカードコンポーネント（一覧表示用）
export function TaskCard({ task, editHref }: TaskCardProps) {
  const status = statusConfig[task.status] ?? { label: task.status, className: 'bg-gray-100 text-gray-600' };
  const categoryStyle = task.category ? (categoryConfig[task.category] ?? { className: 'bg-green-100 text-green-700' }) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        {/* タスク名と分類バッジ（タスク名はタスク詳細ページへのリンク） */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Link
            href={`/tasks/${task.id}`}
            className="text-base font-semibold text-gray-800 hover:text-blue-600 hover:underline truncate transition-colors"
          >
            {task.task_name}
          </Link>
          {task.category && categoryStyle && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.className}`}>
              {task.category}
            </span>
          )}
        </div>

        {/* 報酬 */}
        <p className="text-sm text-gray-500">
          報酬: <span className="font-medium text-gray-700">{task.reward_amount.toLocaleString()}円</span>
        </p>

        {/* 期日 */}
        {task.due_date && (
          <p className="text-xs text-gray-400 mt-1">
            期日: {new Date(task.due_date).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {/* ステータスバッジ */}
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.className}`}>
          {status.label}
        </span>

        {/* 親ユーザーのみ編集リンクを表示する */}
        {editHref && (
          <Link
            href={editHref}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            編集
          </Link>
        )}
      </div>
    </div>
  );
}
