'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface MonthNavigatorProps {
  currentMonth: string;
  /** 当月（JST）の YYYY-MM 文字列 */
  todayMonth: string;
  /** 遷移先のベースパス（例: '/rewards', '/goals'） */
  basePath: string;
}

// YYYY-MM 形式の月を前月/翌月に移動する
function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// 月ナビゲーターコンポーネント（前月/翌月/当月ボタン）
// クエリパラメータ month を変更することでページを再レンダリングする
export function MonthNavigator({ currentMonth, todayMonth, basePath }: MonthNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateTo = useCallback(
    (targetMonth: string) => {
      // 既存のクエリパラメータを保持しつつ month を更新する
      const params = new URLSearchParams(searchParams.toString());
      params.set('month', targetMonth);
      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath],
  );

  const [year, month] = currentMonth.split('-');
  const label = `${year}年${Number(month)}月`;
  const isCurrentMonth = currentMonth === todayMonth;

  return (
    <div className="flex items-center gap-2">
      {/* 前月ボタン */}
      <button
        type="button"
        onClick={() => navigateTo(shiftMonth(currentMonth, -1))}
        className="p-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
        aria-label="前月"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 現在の月表示 */}
      <span className="text-base font-semibold text-gray-800 min-w-[100px] text-center">
        {label}
      </span>

      {/* 翌月ボタン */}
      <button
        type="button"
        onClick={() => navigateTo(shiftMonth(currentMonth, 1))}
        className="p-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
        aria-label="翌月"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 当月ショートカット（当月以外のときのみ表示） */}
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={() => navigateTo(todayMonth)}
          className="ml-2 px-3 py-1.5 text-xs font-medium border rounded-lg bg-white text-blue-600 border-blue-300 hover:bg-blue-50 transition-colors"
        >
          今月
        </button>
      )}
    </div>
  );
}
