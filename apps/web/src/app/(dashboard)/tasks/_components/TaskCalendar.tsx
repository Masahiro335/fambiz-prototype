'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, TaskStatus } from '@fambiz/types';

interface TaskCalendarProps {
  tasks: Task[];
  month: string; // "YYYY-MM"
  role: string | null; // "parent" | "child"
}

// ステータスフィルタの定義
type FilterStatus = 'all' | TaskStatus;

const FILTER_LABELS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'pending', label: '未対応' },
  { value: 'reported', label: '対応済' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
];

// ステータスごとのスタイルクラス
const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  reported: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  expired: 'bg-orange-100 text-orange-600',
};

// 曜日ヘッダー
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

// タスクの期日をJST日付文字列（YYYY-MM-DD）に変換する
function getTaskDateInJST(task: Task): string | null {
  const dateStr = task.due_date ?? task.start_time;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

// YYYY-MM 形式の月を日本語表示に変換する（例: "2026-05" → "2026年5月"）
function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return `${year}年${mon}月`;
}

// 前月・翌月の YYYY-MM 文字列を計算する
function getPrevMonth(year: number, mon: number): string {
  const d = new Date(year, mon - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(year: number, mon: number): string {
  const d = new Date(year, mon, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function TaskCalendar({ tasks, month, role }: TaskCalendarProps) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // 月を解析してカレンダーグリッド計算に必要な値を取得する
  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const lastDay = new Date(year, mon, 0);
  const startWeekday = firstDay.getDay(); // 0=日曜
  const daysInMonth = lastDay.getDate();

  // フィルタ適用後のタスクを取得する
  const filteredTasks =
    filterStatus === 'all'
      ? tasks
      : tasks.filter((task) => task.status === filterStatus);

  // タスクを日付ごとにグループ化する（キー: "YYYY-MM-DD"）
  const tasksByDate = filteredTasks.reduce<Record<string, Task[]>>(
    (acc, task) => {
      const dateKey = getTaskDateInJST(task);
      if (!dateKey) return acc;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
      return acc;
    },
    {},
  );

  // 月ナビゲーションのハンドラ
  const handlePrevMonth = () => {
    router.push(`/tasks?month=${getPrevMonth(year, mon)}`);
  };

  const handleNextMonth = () => {
    router.push(`/tasks?month=${getNextMonth(year, mon)}`);
  };

  // タスクチップクリックで詳細画面へ遷移する
  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  // カレンダーセルの配列を構築する（前月の空白セル + 当月の日付セル）
  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          &lt; 前月
        </button>
        <span className="text-lg font-bold text-gray-800">
          {formatMonthLabel(month)}
        </span>
        <button
          onClick={handleNextMonth}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          次月 &gt;
        </button>
      </div>

      {/* ステータスフィルタ */}
      <div className="flex flex-wrap gap-2">
        {FILTER_LABELS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors ${
              filterStatus === value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAY_LABELS.map((day, index) => (
            <div
              key={day}
              className={`py-2 text-center text-sm font-semibold ${
                index === 0
                  ? 'text-red-500' // 日曜
                  : index === 6
                    ? 'text-blue-500' // 土曜
                    : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            if (day === null) {
              // 空白セル（前月の日付部分）
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[100px] p-1 border-b border-r bg-gray-50"
                />
              );
            }

            const dateKey = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDate[dateKey] ?? [];
            const displayTasks = dayTasks.slice(0, 3); // 最大3件表示
            const extraCount = dayTasks.length - displayTasks.length;

            // 曜日インデックス（0=日、6=土）
            const weekdayIndex = (startWeekday + day - 1) % 7;

            return (
              <div
                key={dateKey}
                className="min-h-[100px] p-1 border-b border-r last:border-r-0"
              >
                {/* 日付番号 */}
                <div
                  className={`text-sm font-medium mb-1 ${
                    weekdayIndex === 0
                      ? 'text-red-500' // 日曜
                      : weekdayIndex === 6
                        ? 'text-blue-500' // 土曜
                        : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>

                {/* タスクチップ */}
                <div className="space-y-0.5">
                  {displayTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate block transition-opacity hover:opacity-80 ${STATUS_STYLES[task.status]}`}
                      title={task.task_name}
                    >
                      {task.task_name}
                    </button>
                  ))}

                  {/* 件数超過の表示 */}
                  {extraCount > 0 && (
                    <div className="text-xs text-gray-400 px-1">
                      +{extraCount}件
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* タスクが0件の場合のメッセージ */}
      {tasks.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
          <p className="text-gray-500">この月のタスクはありません</p>
          {role === 'parent' && (
            <button
              onClick={() => router.push('/tasks/new')}
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              タスクを登録する
            </button>
          )}
        </div>
      )}
    </div>
  );
}
