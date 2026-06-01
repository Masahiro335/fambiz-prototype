import type { Reward } from '@fambiz/types';

interface RewardSummaryProps {
  reward: Reward | null;
  targetMonth: string;
}

// 金額を日本語ロケールでフォーマットする
function formatAmount(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

// 月次報酬サマリーカードコンポーネント
// タスク報酬・ボーナス報酬・合計を表示する
export function RewardSummary({ reward, targetMonth }: RewardSummaryProps) {
  const [year, month] = targetMonth.split('-');
  const monthLabel = `${year}年${Number(month)}月`;

  if (!reward) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <p className="text-sm text-gray-500">{monthLabel}の報酬データはまだありません。</p>
      </div>
    );
  }

  const isPaid = reward.status === 'paid';

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      {/* ヘッダー行：月表示と支払い済みバッジ */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-700">{monthLabel}の報酬サマリー</h3>
        {isPaid && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
            支払い済み
          </span>
        )}
      </div>

      {/* 報酬金額内訳グリッド */}
      <div className="grid grid-cols-3 gap-4">
        {/* タスク報酬 */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">タスク報酬</p>
          <p className="text-xl font-bold text-gray-800">
            {formatAmount(reward.task_reward_total)}
            <span className="text-sm font-normal text-gray-500 ml-0.5">円</span>
          </p>
        </div>

        {/* ボーナス報酬 */}
        <div className="text-center border-x">
          <p className="text-xs text-gray-500 mb-1">ボーナス報酬</p>
          <p className="text-xl font-bold text-yellow-600">
            {formatAmount(reward.bonus_reward_total)}
            <span className="text-sm font-normal text-gray-500 ml-0.5">円</span>
          </p>
        </div>

        {/* 合計 */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">合計</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatAmount(reward.total_amount)}
            <span className="text-sm font-normal text-gray-500 ml-0.5">円</span>
          </p>
        </div>
      </div>

      {/* 支払い日（支払い済みの場合のみ表示） */}
      {isPaid && reward.paid_at && (
        <p className="mt-4 text-xs text-gray-400 text-right">
          支払い日:{' '}
          {new Date(reward.paid_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}
        </p>
      )}

      {/* 星評価とコメント（評価がある場合のみ表示） */}
      {reward.evaluation_score !== null && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-gray-500">評価:</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= (reward.evaluation_score ?? 0)
                      ? 'text-yellow-400'
                      : 'text-gray-200'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          {reward.evaluation_comment && (
            <p className="text-sm text-gray-600 italic">{reward.evaluation_comment}</p>
          )}
        </div>
      )}
    </div>
  );
}
