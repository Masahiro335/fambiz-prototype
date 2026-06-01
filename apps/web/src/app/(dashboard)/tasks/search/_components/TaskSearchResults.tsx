import Link from 'next/link';
import type { Task, TaskStatus } from '@fambiz/types';

interface TaskSearchResultsProps {
  tasks: Task[];
}

// ステータスのラベルとカラークラスの定義（TaskCard.tsx と同一定義）
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

// 分類バッジのカラークラスの定義（TaskCard.tsx と同一定義）
const categoryConfig: Record<string, { className: string }> = {
  掃除: { className: 'bg-blue-100 text-blue-700' },
  料理: { className: 'bg-red-100 text-red-700' },
  洗濯: { className: 'bg-yellow-100 text-yellow-700' },
  その他: { className: 'bg-green-100 text-green-700' },
};

// タスク検索結果テーブルコンポーネント（サーバーコンポーネント）
export function TaskSearchResults({ tasks }: TaskSearchResultsProps) {
  // 検索結果が0件の場合はメッセージを表示する
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">検索結果が見つかりませんでした</p>
        <p className="text-gray-400 text-xs mt-1">検索条件を変えてお試しください。</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">タスク名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">分類</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">報酬</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">期日</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => {
              const status =
                statusConfig[task.status] ?? { label: task.status, className: 'bg-gray-100 text-gray-600' };
              const categoryStyle = task.category
                ? (categoryConfig[task.category] ?? { className: 'bg-green-100 text-green-700' })
                : null;

              return (
                <tr
                  key={task.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {/* タスク名（詳細ページへのリンク） */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="font-medium text-gray-800 hover:text-blue-600 hover:underline transition-colors"
                    >
                      {task.task_name}
                    </Link>
                  </td>

                  {/* 分類バッジ */}
                  <td className="px-4 py-3">
                    {task.category && categoryStyle ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.className}`}
                      >
                        {task.category}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* ステータスバッジ */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>

                  {/* 報酬（右揃え） */}
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {task.reward_amount.toLocaleString()}円
                  </td>

                  {/* 期日（JST） */}
                  <td className="px-4 py-3 text-gray-500">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
                      : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 件数表示フッター */}
      <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
        {tasks.length}件のタスクが見つかりました
      </div>
    </div>
  );
}
