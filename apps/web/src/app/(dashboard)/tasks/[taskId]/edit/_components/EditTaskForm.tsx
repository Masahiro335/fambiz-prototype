'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@fambiz/types';

// 分類の選択肢
const CATEGORIES = ['掃除', '料理', '洗濯', 'その他'] as const;
type Category = (typeof CATEGORIES)[number];

// ISO文字列から日付部分（YYYY-MM-DD）を抽出するヘルパー
function extractDate(isoString: string | null): string {
  if (!isoString) return '';
  // Asia/Tokyoで日付を取得する
  const date = new Date(isoString);
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // sv-SE は YYYY-MM-DD 形式
}

// ISO文字列から時刻部分（HH:MM）を抽出するヘルパー
function extractTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const hh = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false });
  const mm = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', minute: '2-digit' }).padStart(2, '0');
  return `${hh}:${mm}`;
}

// タスク編集フォームコンポーネント（Client Component）
export function EditTaskForm({ task, familyGroupId }: { task: Task; familyGroupId: string }) {
  const router = useRouter();

  // タスクの現在値でフォームを初期化する
  const [taskName, setTaskName] = useState(task.task_name);
  const [category, setCategory] = useState<Category | ''>((task.category as Category) ?? '');
  const [startDate, setStartDate] = useState(extractDate(task.start_time));
  const [startTime, setStartTime] = useState(extractTime(task.start_time));
  const [endDate, setEndDate] = useState(extractDate(task.end_time));
  const [endTime, setEndTime] = useState(extractTime(task.end_time));
  const [hasDueDate, setHasDueDate] = useState(!!task.due_date);
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.substring(0, 10) : '');
  const [rewardAmount, setRewardAmount] = useState(String(task.reward_amount));
  const [memo, setMemo] = useState(task.memo ?? '');
  const [isImmediateComplete, setIsImmediateComplete] = useState(false);

  // UI状態
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        taskName: taskName.trim(),
        ...(category ? { category } : {}),
        rewardAmount: rewardNum,
        ...(startTimeIso ? { startTime: startTimeIso } : {}),
        ...(endTimeIso ? { endTime: endTimeIso } : {}),
        ...(hasDueDate && dueDate ? { dueDate: dueDate } : {}),
        ...(memo.trim() ? { memo: memo.trim() } : {}),
      };

      // PUT /v1/tasks/:id でタスクを更新する
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/tasks/${task.id}`, {
        method: 'PUT',
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
              : 'タスクの更新に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 更新成功後はタスク一覧へ遷移する
      router.push('/tasks');
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  // タスク削除ハンドラ
  async function handleDelete() {
    // 削除前にユーザーへ確認を求める
    if (!window.confirm('このタスクを削除しますか？')) return;

    setIsDeleting(true);
    setErrorMessage(null);

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

      // DELETE /v1/tasks/:id でタスクを削除する
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errorBody = (await res.json()) as { message?: string | string[] };
        const message: string =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : Array.isArray(errorBody.message)
              ? errorBody.message.join(' ')
              : 'タスクの削除に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 削除成功後はタスク一覧へ遷移する
      router.push('/tasks');
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  }

  // familyGroupId は現在のところサーバーコンポーネントから受け取っているが
  // 編集フォームでは使用しないため、型エラー回避のためvoidで参照する
  void familyGroupId;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">タスクを編集する</h2>

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

        {/* 期日 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input
              id="hasDueDate"
              type="checkbox"
              checked={hasDueDate}
              onChange={(e) => {
                setHasDueDate(e.target.checked);
                if (!e.target.checked) setDueDate('');
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hasDueDate" className="text-sm font-medium text-gray-700">
              期日を設定する
            </label>
          </div>
          {hasDueDate && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
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
            disabled={isLoading || isDeleting}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '更新中...' : '更新する'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/tasks')}
            disabled={isLoading || isDeleting}
            className="flex-1 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            閉じる
          </button>
        </div>

        {/* 削除ボタン（破壊的操作のため分離して配置） */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading || isDeleting}
            className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '削除中...' : '削除する'}
          </button>
        </div>
      </form>
    </div>
  );
}
