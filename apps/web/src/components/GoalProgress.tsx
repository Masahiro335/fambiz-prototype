'use client';

interface GoalProgressProps {
  /** 進捗率（0〜100） */
  rate: number;
  className?: string;
}

// 目標進捗バーコンポーネント
// rate が 100 なら緑色、50以上なら青色、それ以下なら灰色で表示する
export function GoalProgress({ rate, className }: GoalProgressProps) {
  // 0〜100の範囲にクランプする
  const clampedRate = Math.min(100, Math.max(0, rate));

  // 進捗率に応じてバーの色を決定する
  const barColor =
    clampedRate >= 100
      ? 'bg-green-500'
      : clampedRate >= 50
        ? 'bg-blue-500'
        : 'bg-gray-400';

  return (
    <div className={className}>
      {/* 進捗率テキスト */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">進捗</span>
        <span className="text-xs font-semibold text-gray-700">{clampedRate}%</span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clampedRate}%` }}
        />
      </div>
    </div>
  );
}
