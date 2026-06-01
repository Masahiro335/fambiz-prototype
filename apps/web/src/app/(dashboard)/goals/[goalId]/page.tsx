import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { GoalStatusActions } from './_components/GoalStatusActions';
import { GoalDeleteButton } from './_components/GoalDeleteButton';
import type { Goal, GoalStatus, JwtPayload, Task } from '@fambiz/types';

// ステータスのラベルとカラークラスを定義する
const statusConfig: Record<GoalStatus, { label: string; className: string }> = {
  not_started: {
    label: '未挑戦',
    className: 'bg-gray-100 text-gray-600',
  },
  in_progress: {
    label: '挑戦中',
    className: 'bg-blue-100 text-blue-600',
  },
  pending_approval: {
    label: '承認待ち',
    className: 'bg-yellow-100 text-yellow-700',
  },
  achieved: {
    label: '達成済',
    className: 'bg-green-100 text-green-600',
  },
  failed: {
    label: '未達成',
    className: 'bg-red-100 text-red-600',
  },
};

// 目標詳細ページ（Server Component）
export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからロールを取得する
  let role: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    role = payload.role ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as { role?: string };
    role = metadata.role ?? null;
  }

  // 目標詳細を取得する
  let goal: Goal | null = null;
  try {
    goal = await apiFetch<Goal>(`/v1/goals/${goalId}`);
  } catch {
    // 目標が取得できない場合は目標一覧へリダイレクトする
    redirect('/goals');
  }

  if (!goal) {
    redirect('/goals');
  }

  // 紐づくタスクの名前を取得する（task_id がある場合のみ）
  let linkedTaskName: string | null = null;
  if (goal.task_id) {
    try {
      const task = await apiFetch<Task>(`/v1/tasks/${goal.task_id}`);
      linkedTaskName = task.task_name;
    } catch {
      // タスクが取得できない場合は表示しない
    }
  }

  const status = statusConfig[goal.status] ?? {
    label: goal.status,
    className: 'bg-gray-100 text-gray-600',
  };

  // target_month（YYYY-MM）を日本語表記に変換する
  const [year, month] = goal.target_month.split('-');
  const targetMonthLabel = `${year}年${Number(month)}月`;

  return (
    <div className="max-w-2xl">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">目標詳細</h2>
        <Link
          href="/goals"
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          ← 戻る
        </Link>
      </div>

      {/* 目標詳細カード */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        {/* 目標名とステータスバッジ */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-gray-800">{goal.goal_name}</h3>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* 詳細情報リスト */}
        <dl className="divide-y divide-gray-100">
          {/* 対象月 */}
          <div className="py-3 flex items-center justify-between">
            <dt className="text-sm font-medium text-gray-500">対象月</dt>
            <dd className="text-sm text-gray-800">{targetMonthLabel}</dd>
          </div>

          {/* 紐づくタスク名（設定されている場合のみ表示） */}
          {linkedTaskName && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">タスク名</dt>
              <dd className="text-sm text-gray-800">{linkedTaskName}</dd>
            </div>
          )}

          {/* ボーナス金額 */}
          <div className="py-3 flex items-center justify-between">
            <dt className="text-sm font-medium text-gray-500">ボーナス金額</dt>
            <dd className="text-sm font-semibold text-gray-800">
              {goal.goal_reward.toLocaleString()}円
            </dd>
          </div>

          {/* 目標回数（設定されている場合のみ表示） */}
          {goal.target_count !== null && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">目標回数</dt>
              <dd className="text-sm text-gray-800">{goal.target_count}回</dd>
            </div>
          )}

          {/* 行動（設定されている場合のみ表示） */}
          {goal.action !== null && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">行動</dt>
              <dd className="text-sm text-gray-800">{goal.action}</dd>
            </div>
          )}

          {/* AND条件（目標回数・行動の両方が設定されている場合のみ表示） */}
          {goal.target_count !== null && goal.action !== null && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">達成条件</dt>
              <dd className="text-sm text-gray-800">
                {goal.and_condition_flag ? (
                  <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-xs">✓</span>
                    回数と行動の両方を達成する必要がある
                  </span>
                ) : (
                  '回数または行動のどちらかを達成'
                )}
              </dd>
            </div>
          )}

          {/* 担当者名（設定されている場合のみ表示） */}
          {goal.assignee && (
            <div className="py-3 flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">担当者</dt>
              <dd className="text-sm text-gray-800">{goal.assignee.name}</dd>
            </div>
          )}

          {/* 登録日時 */}
          <div className="py-3 flex items-center justify-between">
            <dt className="text-sm font-medium text-gray-500">登録日時</dt>
            <dd className="text-sm text-gray-800">
              {new Date(goal.created_at).toLocaleDateString('ja-JP', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
        </dl>

        {/* 親ユーザー向け編集・削除ボタン */}
        {role === 'parent' && (
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Link
              href={`/goals/${goal.id}/edit`}
              className="flex-1 py-2.5 text-center bg-white text-blue-600 font-medium text-sm rounded-lg border border-blue-300 hover:bg-blue-50 transition-colors"
            >
              編集
            </Link>
            <GoalDeleteButton goalId={goal.id} />
          </div>
        )}
      </div>

      {/* ステータス変更アクションボタン（Client Component） */}
      <GoalStatusActions goal={goal} role={role} />
    </div>
  );
}
