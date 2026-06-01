'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface RewardActionsProps {
  rewardId: string;
  currentScore: number | null;
  currentComment: string | null;
  isPending: boolean;
  /** 親ユーザーのみ評価・支払い操作を行えるため、ロールを受け取る */
  role: string;
}

// 報酬に対する評価フォームと支払い完了ボタンのクライアントコンポーネント
// 親ユーザーのみ操作可能
export function RewardActions({
  rewardId,
  currentScore,
  currentComment,
  isPending,
  role,
}: RewardActionsProps) {
  const router = useRouter();
  const [isPaying, startPayTransition] = useTransition();
  const [isEvaluating, startEvalTransition] = useTransition();

  // 評価フォームの状態
  const [score, setScore] = useState<number>(currentScore ?? 0);
  const [comment, setComment] = useState<string>(currentComment ?? '');
  const [hoverScore, setHoverScore] = useState<number>(0);

  // エラーメッセージ
  const [payError, setPayError] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalSuccess, setEvalSuccess] = useState(false);

  // 親以外は何も表示しない
  if (role !== 'parent') {
    return null;
  }

  // 評価を登録するハンドラ
  function handleEvaluate() {
    if (score === 0) {
      setEvalError('星評価（1〜5）を選択してください。');
      return;
    }
    setEvalError(null);
    setEvalSuccess(false);

    startEvalTransition(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/rewards/${rewardId}/evaluation`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              evaluation_score: score,
              evaluation_comment: comment || undefined,
            }),
            credentials: 'include',
          },
        );
        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          setEvalError(body.message ?? '評価の登録に失敗しました。');
          return;
        }
        setEvalSuccess(true);
        router.refresh();
      } catch {
        setEvalError('評価の登録中にエラーが発生しました。');
      }
    });
  }

  // 支払い完了を登録するハンドラ
  function handlePay() {
    setPayError(null);

    startPayTransition(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/rewards/${rewardId}/pay`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            credentials: 'include',
          },
        );
        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          setPayError(body.message ?? '支払い処理に失敗しました。');
          return;
        }
        router.refresh();
      } catch {
        setPayError('支払い処理中にエラーが発生しました。');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 星評価とコメント入力フォーム */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">評価を登録</h3>

        {/* 星評価セレクター（1〜5） */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            星評価 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverScore(star)}
                onMouseLeave={() => setHoverScore(0)}
                onClick={() => setScore(star)}
                className="focus:outline-none"
                aria-label={`${star}星`}
              >
                <svg
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverScore || score) ? 'text-yellow-400' : 'text-gray-200'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          {score > 0 && (
            <p className="text-xs text-gray-500 mt-1">{score}点を選択中</p>
          )}
        </div>

        {/* コメント入力 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2" htmlFor="eval-comment">
            コメント（任意）
          </label>
          <textarea
            id="eval-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="今月の頑張りへのコメントを入力..."
            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* エラーメッセージ */}
        {evalError && (
          <p className="text-sm text-red-600 mb-3">{evalError}</p>
        )}

        {/* 成功メッセージ */}
        {evalSuccess && (
          <p className="text-sm text-green-600 mb-3">評価を登録しました。</p>
        )}

        <button
          type="button"
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isEvaluating ? '登録中...' : '評価を登録する'}
        </button>
      </div>

      {/* 支払い完了ボタン（statusが pending のときのみ有効） */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-2">支払い</h3>
        <p className="text-sm text-gray-500 mb-4">
          報酬の支払いを完了したら「支払い完了」ボタンを押してください。
        </p>

        {payError && (
          <p className="text-sm text-red-600 mb-3">{payError}</p>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={!isPending || isPaying}
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPaying ? '処理中...' : '支払い完了'}
        </button>

        {!isPending && (
          <p className="text-xs text-gray-400 mt-2">すでに支払い済みです。</p>
        )}
      </div>
    </div>
  );
}
