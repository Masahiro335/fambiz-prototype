'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface YearSelectorProps {
  selectedYear: number;
  availableYears: number[];
}

// 年度選択セレクトコンポーネント
// クエリパラメータ year を変更してページを再レンダリングする
export function YearSelector({ selectedYear, availableYears }: YearSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (year: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('year', year);
      router.push(`/rewards/graph?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="year-select" className="text-sm text-gray-500">
        年度:
      </label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}年
          </option>
        ))}
      </select>
    </div>
  );
}
