import type { RewardGraphMonth } from '@fambiz/types';

interface RewardHistoryTableProps {
  months: RewardGraphMonth[];
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

function toMonthLabel(targetMonth: string): string {
  const [year, month] = targetMonth.split('-');
  return `${year}年${Number(month)}月`;
}

// 月次報酬明細テーブルコンポーネント
export function RewardHistoryTable({ months }: RewardHistoryTableProps) {
  const totalTask = months.reduce((acc, m) => acc + m.task_reward_total, 0);
  const totalBonus = months.reduce((acc, m) => acc + m.bonus_reward_total, 0);
  const totalAmount = months.reduce((acc, m) => acc + m.total_amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
      <div className="px-6 py-4 border-b">
        <h3 className="text-base font-semibold text-gray-700">月別報酬明細</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3">月</th>
              <th className="px-6 py-3 text-right">タスク報酬</th>
              <th className="px-6 py-3 text-right">ボーナス報酬</th>
              <th className="px-6 py-3 text-right font-bold">合計</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {months.map((m) => (
              <tr key={m.target_month} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-700">
                  {toMonthLabel(m.target_month)}
                </td>
                <td className="px-6 py-3 text-right text-gray-600">
                  {formatAmount(m.task_reward_total)}
                  <span className="text-xs text-gray-400 ml-0.5">円</span>
                </td>
                <td className="px-6 py-3 text-right text-yellow-600">
                  {formatAmount(m.bonus_reward_total)}
                  <span className="text-xs text-gray-400 ml-0.5">円</span>
                </td>
                <td className="px-6 py-3 text-right font-semibold text-blue-600">
                  {formatAmount(m.total_amount)}
                  <span className="text-xs text-gray-400 ml-0.5">円</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="px-6 py-3 font-semibold text-gray-700">合計</td>
              <td className="px-6 py-3 text-right font-semibold text-gray-700">
                {formatAmount(totalTask)}
                <span className="text-xs text-gray-400 ml-0.5">円</span>
              </td>
              <td className="px-6 py-3 text-right font-semibold text-yellow-600">
                {formatAmount(totalBonus)}
                <span className="text-xs text-gray-400 ml-0.5">円</span>
              </td>
              <td className="px-6 py-3 text-right font-bold text-blue-700 text-base">
                {formatAmount(totalAmount)}
                <span className="text-sm text-gray-400 ml-0.5">円</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
