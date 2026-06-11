'use client';

import { GoalCard } from './GoalCard';
import type { Goal } from '@fambiz/types';

interface GoalListProps {
  goals: Goal[];
  /** taskId → task_name のマップ。タスク名表示に使用する */
  taskNameMap?: Record<string, string>;
}

// 目標一覧コンポーネント
// 目標が空の場合は空状態メッセージを表示する
export function GoalList({ goals, taskNameMap = {} }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-10 max-w-md text-center">
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          目標がありません
        </h3>
        <p className="text-sm text-gray-500">
          今月の目標はまだ登録されていません。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          taskName={goal.task_id ? taskNameMap[goal.task_id] : undefined}
        />
      ))}
    </div>
  );
}
