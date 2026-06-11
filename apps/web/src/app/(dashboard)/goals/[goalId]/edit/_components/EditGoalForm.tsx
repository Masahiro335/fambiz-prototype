'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TaskSearchModal } from '@/components/TaskSearchModal';
import type { Goal, GroupMember } from '@fambiz/types';

// 目標編集フォームコンポーネント（Client Component）
export function EditGoalForm({
  goal,
  members,
  groupId,
  initialTaskName,
}: {
  goal: Goal;
  members: GroupMember[];
  groupId: string;
  initialTaskName?: string;
}) {
  const router = useRouter();

  // 既存の目標データでフォームを初期化する
  const [goalName, setGoalName] = useState(goal.goal_name);
  const [goalReward, setGoalReward] = useState(String(goal.goal_reward));
  const [targetMonth, setTargetMonth] = useState(goal.target_month);
  const [assigneeId, setAssigneeId] = useState(goal.assignee_id ?? '');
  const [taskId, setTaskId] = useState(goal.task_id ?? '');
  const [selectedTaskName, setSelectedTaskName] = useState(initialTaskName ?? '');
  const [targetCount, setTargetCount] = useState(
    goal.target_count !== null ? String(goal.target_count) : '',
  );
  const [action, setAction] = useState(goal.action ?? '');
  const [andConditionFlag, setAndConditionFlag] = useState(goal.and_condition_flag);

  // UI状態
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // 担当者の選択肢（子ユーザーのみ）
  const childMembers = members.filter((m) => m.user?.role === 'child');

  // フォーム送信ハンドラ
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    // バリデーション: 目標名は必須
    if (!goalName.trim()) {
      setErrorMessage('目標名を入力してください。');
      return;
    }

    // バリデーション: ボーナス報酬は0以上の整数
    const rewardNum = parseInt(goalReward, 10);
    if (goalReward === '' || isNaN(rewardNum) || rewardNum < 0) {
      setErrorMessage('ボーナス報酬には0以上の整数を入力してください。');
      return;
    }

    // バリデーション: 対象月は必須
    if (!targetMonth) {
      setErrorMessage('対象月を選択してください。');
      return;
    }

    // バリデーション: 目標回数が入力されている場合は1以上の整数
    let targetCountNum: number | undefined = undefined;
    if (targetCount !== '') {
      targetCountNum = parseInt(targetCount, 10);
      if (isNaN(targetCountNum) || targetCountNum < 1) {
        setErrorMessage('目標回数には1以上の整数を入力してください。');
        return;
      }
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('セッションが無効です。再ログインしてください。');
        return;
      }

      // リクエストボディを組み立てる（APIはcamelCase）
      const requestBody = {
        goalName: goalName.trim(),
        goalReward: rewardNum,
        targetMonth,
        assigneeId: assigneeId || null,
        taskId: taskId || null,
        targetCount: targetCountNum ?? null,
        action: action.trim() || null,
        andConditionFlag,
      };

      // PUT /v1/goals/:id で目標を更新する
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/goals/${goal.id}`, {
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
              : '目標の更新に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 更新成功後は詳細ページへ戻る
      router.push(`/goals/${goal.id}`);
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* タスク検索モーダル */}
      {showTaskModal && (
        <TaskSearchModal
          groupId={groupId}
          onSelect={(id, name) => {
            setTaskId(id);
            setSelectedTaskName(name);
            setShowTaskModal(false);
          }}
          onClose={() => setShowTaskModal(false)}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
      {/* エラーメッセージ表示エリア */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 目標名 */}
        <div>
          <label htmlFor="goalName" className="block text-sm font-medium text-gray-700 mb-1">
            目標名 <span className="text-red-500">*</span>
          </label>
          <input
            id="goalName"
            type="text"
            required
            maxLength={150}
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* タスク名（タスク検索モーダルで選択） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タスク名</label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-gray-50 min-h-[42px] flex items-center">
              {selectedTaskName ? (
                <span>{selectedTaskName}</span>
              ) : (
                <span className="text-gray-400">タスク未選択</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowTaskModal(true)}
              className="px-4 py-2.5 bg-white text-blue-600 text-sm font-medium rounded-lg border border-blue-300 hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              タスク検索
            </button>
            {taskId && (
              <button
                type="button"
                onClick={() => { setTaskId(''); setSelectedTaskName(''); }}
                className="px-3 py-2.5 text-gray-400 hover:text-gray-600 text-sm transition-colors"
                title="クリア"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 対象月 */}
        <div>
          <label htmlFor="targetMonth" className="block text-sm font-medium text-gray-700 mb-1">
            対象月 <span className="text-red-500">*</span>
          </label>
          <input
            id="targetMonth"
            type="month"
            required
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* ボーナス報酬 */}
        <div>
          <label htmlFor="goalReward" className="block text-sm font-medium text-gray-700 mb-1">
            ボーナス報酬（円） <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="goalReward"
              type="number"
              min={0}
              required
              value={goalReward}
              onChange={(e) => setGoalReward(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              円
            </span>
          </div>
        </div>

        {/* 担当者（子ユーザーのみ選択可能） */}
        {childMembers.length > 0 && (
          <div>
            <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-1">
              担当者
            </label>
            <select
              id="assigneeId"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">未設定</option>
              {childMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name ?? m.user_id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 目標回数（定量目標） */}
        <div>
          <label htmlFor="targetCount" className="block text-sm font-medium text-gray-700 mb-1">
            目標回数
            <span className="ml-1 text-xs text-gray-400">（定量目標の場合に入力）</span>
          </label>
          <div className="relative">
            <input
              id="targetCount"
              type="number"
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              placeholder="例：10"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              回
            </span>
          </div>
        </div>

        {/* 行動内容（任意） */}
        <div>
          <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
            行動内容
          </label>
          <input
            id="action"
            type="text"
            maxLength={255}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="例：皿洗いを毎日行う"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* AND条件フラグ（目標回数と行動内容の両方が入力されている場合のみ表示） */}
        {targetCount && action && (
          <div className="flex items-center gap-2">
            <input
              id="andConditionFlag"
              type="checkbox"
              checked={andConditionFlag}
              onChange={(e) => setAndConditionFlag(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="andConditionFlag" className="text-sm font-medium text-gray-700">
              回数と行動の両方を達成する必要がある
            </label>
          </div>
        )}

        {/* ボタン群 */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '更新中...' : '更新する'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/goals/${goal.id}`)}
            disabled={isLoading}
            className="flex-1 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
    </>
  );
}
