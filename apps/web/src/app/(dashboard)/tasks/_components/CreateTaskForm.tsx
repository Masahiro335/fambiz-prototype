'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 分類の選択肢
const CATEGORIES = ['掃除', '料理', '洗濯', 'その他'] as const;
type Category = (typeof CATEGORIES)[number];

// タスク登録フォームコンポーネント（Client Component）
export function CreateTaskForm({ groupId }: { groupId: string }) {
  const router = useRouter();

  // フォームフィールドの状態
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isImmediateComplete, setIsImmediateComplete] = useState(false);

  // UI状態
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // フォーム送信ハンドラ
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    // バリデーション: タスク名は必須
    if (!taskName.trim()) {
      setErrorMessage('タスク名を入力してください。');
      return;
    }

    // バリデーション: 報酬は必須かつ0以上の整数
    const rewardNum = parseInt(rewardAmount, 10);
    if (rewardAmount === '' || isNaN(rewardNum) || rewardNum < 0) {
      setErrorMessage('報酬には0以上の整数を入力してください。');
      return;
    }

    setIsLoading(true);

    try {
      // ブラウザ側でSupabaseセッションを取得しアクセストークンを付与する
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('セッションが無効です。再ログインしてください。');
        return;
      }

      // 開始日時・終了日時をISO 8601形式に変換する（入力がある場合のみ）
      const startTimeIso =
        startDate && startTime ? new Date(`${startDate}T${startTime}:00`).toISOString() : undefined;
      const endTimeIso =
        endDate && endTime ? new Date(`${endDate}T${endTime}:00`).toISOString() : undefined;

      // リクエストボディを組み立てる（DTOはcamelCase）
      const requestBody = {
        groupId,
        taskName: taskName.trim(),
        ...(category ? { category } : {}),
        rewardAmount: rewardNum,
        ...(startTimeIso ? { startTime: startTimeIso } : {}),
        ...(endTimeIso ? { endTime: endTimeIso } : {}),
        ...(memo.trim() ? { memo: memo.trim() } : {}),
      };

      // POST /v1/tasks でタスクを作成する
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorBody = (await res.json()) as { message?: string | string[] };
        const message: string =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : Array.isArray(errorBody.message)
              ? errorBody.message.join(' ')
              : 'タスクの登録に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 登録成功後はタスク一覧へ遷移する
      router.push('/tasks');
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">タスクを登録する</h2>

      {/* エラーメッセージ表示エリア */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* タスク名 */}
        <div>
          <label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-1">
            タスク名 <span className="text-red-500">*</span>
          </label>
          <input
            id="taskName"
            type="text"
            required
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="例：部屋の掃除"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 分類（ボタン選択） */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">分類</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(category === cat ? '' : cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  category === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 開始日時 */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">開始日時</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-32 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 終了日時 */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">終了日時</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-32 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 報酬 */}
        <div>
          <label htmlFor="rewardAmount" className="block text-sm font-medium text-gray-700 mb-1">
            報酬（円） <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="rewardAmount"
              type="number"
              min={0}
              required
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              placeholder="例：300"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              円
            </span>
          </div>
        </div>

        {/* メモ */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
            メモ
          </label>
          <textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="補足説明があれば記入してください"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 即完了フラグ（UIのみ、現段階ではAPIへの送信は不要） */}
        <div className="flex items-center gap-2">
          <input
            id="isImmediateComplete"
            type="checkbox"
            checked={isImmediateComplete}
            onChange={(e) => setIsImmediateComplete(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isImmediateComplete" className="text-sm font-medium text-gray-700">
            即に完了にする
          </label>
        </div>

        {/* ボタン群 */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登録中...' : '登録する'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/tasks')}
            disabled={isLoading}
            className="flex-1 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            閉じる
          </button>
        </div>
      </form>
    </div>
  );
}
