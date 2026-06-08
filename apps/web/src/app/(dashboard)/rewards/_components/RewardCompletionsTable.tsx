import type { TaskCompletion } from '@fambiz/types';

interface CompletionRow {
  task_id: string;
  task_name: string;
  category: string | null;
  completedCount: number;
  incompleteCount: number;
  taskReward: number;
}

interface RewardCompletionsTableProps {
  completions: TaskCompletion[];
}

// TaskCompletion配列をタスク別にグループ化して集計する
function aggregateByTask(completions: TaskCompletion[]): CompletionRow[] {
  const map = new Map<string, CompletionRow>();

  for (const c of completions) {
    const key = c.task_id;
    const existing = map.get(key);
    if (existing) {
      // 承認済み（approved_at がある）を完了、それ以外を未完了とみなす
      if (c.approved_at) {
        existing.completedCount += 1;
        existing.taskReward += c.confirmed_reward;
      } else {
        existing.incompleteCount += 1;
      }
    } else {
      map.set(key, {
        task_id: c.task_id,
        task_name: c.task_name ?? c.task_id,
        category: c.category ?? null,
        completedCount: c.approved_at ? 1 : 0,
        incompleteCount: c.approved_at ? 0 : 1,
        taskReward: c.approved_at ? c.confirmed_reward : 0,
      });
    }
  }

  return Array.from(map.values());
}

// タスク別明細テーブルコンポーネント
export function RewardCompletionsTable({ completions }: RewardCompletionsTableProps) {
  if (completions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-sm text-gray-500">この月のタスク完了記録はありません。</p>
      </div>
    );
  }

  const rows = aggregateByTask(completions);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                タスク名
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                報酬
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                完了数
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                未完了数
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                分類
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.task_id} className="hover:bg-gray-50 transition-colors">
                {/* タスク名 */}
                <td className="px-4 py-3 text-gray-800 font-medium">{row.task_name}</td>

                {/* 報酬（タスク単価×完了数の合計） */}
                <td className="px-4 py-3 text-right text-gray-800 whitespace-nowrap">
                  {row.taskReward.toLocaleString('ja-JP')}
                  <span className="text-xs text-gray-400 ml-0.5">円</span>
                </td>

                {/* 完了数 */}
                <td className="px-4 py-3 text-right text-gray-800">{row.completedCount}</td>

                {/* 未完了数 */}
                <td className="px-4 py-3 text-right text-gray-500">{row.incompleteCount}</td>

                {/* 分類 */}
                <td className="px-4 py-3">
                  {row.category ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {row.category}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
