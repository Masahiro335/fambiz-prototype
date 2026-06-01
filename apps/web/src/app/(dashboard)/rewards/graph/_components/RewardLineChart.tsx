'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RewardGraphMonth } from '@fambiz/types';

interface RewardLineChartProps {
  months: RewardGraphMonth[];
}

// YYYY-MM を M月 形式に変換する
function toMonthLabel(targetMonth: string): string {
  const [, month] = targetMonth.split('-');
  return `${Number(month)}月`;
}

// 金額をツールチップ用にフォーマットする
function formatYen(value: number): string {
  return `${value.toLocaleString('ja-JP')}円`;
}

// 月次報酬推移の折れ線グラフコンポーネント
export function RewardLineChart({ months }: RewardLineChartProps) {
  const data = months.map((m) => ({
    month: toMonthLabel(m.target_month),
    タスク報酬: m.task_reward_total,
    ボーナス報酬: m.bonus_reward_total,
    合計: m.total_amount,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <h3 className="text-base font-semibold text-gray-700 mb-4">月別報酬推移</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12 }}
            width={40}
          />
          <Tooltip formatter={(value: number) => formatYen(value)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="タスク報酬"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="ボーナス報酬"
            stroke="#eab308"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="合計"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
