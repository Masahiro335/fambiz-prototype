'use client';

import Link from 'next/link';
import { GoalProgress } from '@/components/GoalProgress';
import type { Goal, GoalStatus } from '@fambiz/types';

interface GoalCardProps {
  goal: Goal;
  /** 進捗率（0〜100）。API が返す場合のみ渡す */
  progressRate?: number;
  /** 紐づくタスクの名前。task_id がある場合に親コンポーネントから渡す */
  taskName?: string;
}

// ステータスのラベルとカラークラスを定義する
const statusConfig: Record<GoalStatus, { label: string; className: string }> = {
  not_started: {
    label: '未挑戦',
    className: 'bg-gray-100 text-gray-600',
  },
  in_progress: {
    label: '挑戦中',
    className: 'bg-blue-100 text-blue-600',
  },
  pending_approval: {
    label: '承認待ち',
    className: 'bg-yellow-100 text-yellow-700',
  },
  achieved: {
    label: '達成済',
    className: 'bg-green-100 text-green-600',
  },
  failed: {
    label: '未達成',
    className: 'bg-red-100 text-red-600',
  },
};

// 目標カードコンポーネント（一覧表示用）
export function GoalCard({ goal, progressRate, taskName }: GoalCardProps) {
  const status = statusConfig[goal.status] ?? {
    label: goal.status,
    className: 'bg-gray-100 text-gray-600',
  };

  // target_month（YYYY-MM）を日本語表記に変換する
  const [year, month] = goal.target_month.split('-');
  const targetMonthLabel = `${year}年${Number(month)}月`;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {/* 目標名（クリックで詳細ページへ遷移） */}
          <Link
            href={`/goals/${goal.id}`}
            className="text-base font-semibold text-gray-800 hover:text-blue-600 hover:underline transition-colors line-clamp-2"
          >
            {goal.goal_name}
          </Link>

          {/* 対象月 */}
          <p className="text-xs text-gray-400 mt-1">{targetMonthLabel}</p>

          {/* タスク名（紐づくタスクがある場合のみ表示） */}
          {taskName && (
            <p className="text-xs text-gray-500 mt-1">
              タスク:{' '}
              <span className="font-medium text-gray-700">{taskName}</span>
            </p>
          )}
        </div>

        {/* ステータスバッジ */}
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* ボーナス金額 */}
      <p className="text-sm text-gray-500 mb-3">
        ボーナス:{' '}
        <span className="font-semibold text-gray-800">
          {goal.goal_reward.toLocaleString()}円
        </span>
      </p>

      {/* 進捗バー（progressRate がある場合のみ表示） */}
      {progressRate !== undefined && (
        <GoalProgress rate={progressRate} />
      )}
    </div>
  );
}
