import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { Suspense } from 'react';
import { RewardSummary } from './_components/RewardSummary';
import { RewardCompletionsTable } from './_components/RewardCompletionsTable';
import { RewardActions } from './_components/RewardActions';
import { MonthNavigator } from '@/components/MonthNavigator';
import { ChildSelector } from './_components/ChildSelector';
import type { Reward, TaskCompletion, GroupMember, JwtPayload } from '@fambiz/types';

// JST（UTC+9）の現在月を YYYY-MM 形式で返す
function getDefaultMonth(): string {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

interface RewardsPageProps {
  searchParams: Promise<{ month?: string; childId?: string }>;
}

// 月次報酬管理ページ（Server Component）
export default async function RewardsPage({ searchParams }: RewardsPageProps) {
  const { month, childId } = await searchParams;
  const todayMonth = getDefaultMonth();
  // クエリパラメータで月が指定された場合はそれを使用し、なければ当月を使用する
  const targetMonth = month ?? todayMonth;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからユーザーのロール・family_group_id・user_idを取得する
  let role: string | null = null;
  let familyGroupId: string | null = null;
  let userId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    role = payload.role ?? null;
    familyGroupId = payload.family_group_id ?? null;
    userId = payload.sub ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as {
      role?: string;
      family_group_id?: string;
    };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
    userId = session.user.id;
  }

  // グループ未参加の場合はグループ参加を促すUIを表示する
  if (!familyGroupId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-6">報酬管理</h2>
        <div className="bg-white rounded-xl shadow-sm border p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            グループに参加してください
          </h3>
          <p className="text-sm text-gray-500">
            報酬を確認するには家族グループへの参加が必要です。
          </p>
          <Link
            href="/family"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            家族管理へ
          </Link>
        </div>
      </div>
    );
  }

  // 子ユーザー一覧を取得する（親ユーザーの場合のみ必要）
  let childMembers: GroupMember[] = [];
  if (role === 'parent') {
    try {
      const allMembers = await apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`);
      childMembers = allMembers.filter((m) => m.user?.role === 'child');
    } catch {
      // メンバー取得失敗時は空のリストとして扱う
    }
  }

  // 表示対象の子IDを決定する
  // 親の場合: クエリパラメータ childId を優先し、なければ最初の子を使用する
  // 子の場合: 自分のIDを使用する
  let targetChildId: string | null = null;
  if (role === 'parent') {
    if (childId && childMembers.some((m) => m.user_id === childId)) {
      targetChildId = childId;
    } else if (childMembers.length > 0) {
      targetChildId = childMembers[0].user_id;
    }
  } else {
    targetChildId = userId;
  }

  // 報酬データを取得する（GET /rewards は単一 Reward を返す）
  let reward: Reward | null = null;
  if (targetChildId) {
    try {
      reward = await apiFetch<Reward>(
        `/v1/rewards?groupId=${familyGroupId}&childId=${targetChildId}&targetMonth=${targetMonth}`,
      );
    } catch {
      // APIエラー時はnullのまま扱う
    }
  }

  // タスク別完了明細を取得する（報酬データがある場合のみ）
  let completions: TaskCompletion[] = [];
  if (reward) {
    try {
      completions = await apiFetch<TaskCompletion[]>(
        `/v1/rewards/${reward.id}/completions`,
      );
    } catch {
      // 取得失敗時は空のリストとして扱う
    }
  }

  return (
    <div>
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">報酬管理</h2>
        <Link
          href="/rewards/graph"
          className="text-sm text-blue-600 hover:underline"
        >
          年次グラフを見る →
        </Link>
      </div>

      {/* 月ナビゲーターと子セレクターを横並びに表示 */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Suspense でラップして useSearchParams のハイドレーションエラーを防ぐ */}
        <Suspense fallback={<div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />}>
          <MonthNavigator currentMonth={targetMonth} todayMonth={todayMonth} basePath="/rewards" />
        </Suspense>

        {/* 親ユーザーかつ子が複数いる場合のみ子選択セレクターを表示 */}
        {role === 'parent' && childMembers.length > 0 && (
          <Suspense fallback={<div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />}>
            <ChildSelector
              childMembers={childMembers}
              selectedChildId={targetChildId ?? ''}
            />
          </Suspense>
        )}
      </div>

      {/* グループに子ユーザーがいない場合のメッセージ（親のみ） */}
      {role === 'parent' && childMembers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center max-w-md mb-6">
          <p className="text-sm text-gray-500">
            グループにお子さまがいません。家族グループに子ユーザーを招待してください。
          </p>
          <Link
            href="/family"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            家族管理へ
          </Link>
        </div>
      )}

      {/* 報酬サマリーカード */}
      {targetChildId && (
        <>
          <RewardSummary reward={reward} targetMonth={targetMonth} />

          {/* タスク別完了明細テーブル */}
          <h3 className="text-base font-semibold text-gray-700 mb-3">タスク別明細</h3>
          <div className="mb-6">
            <RewardCompletionsTable completions={completions} />
          </div>

          {/* 評価フォームと支払いボタン（親ユーザー・報酬データがある場合のみ） */}
          {role === 'parent' && reward && (
            <RewardActions
              rewardId={reward.id}
              currentScore={reward.evaluation_score}
              currentComment={reward.evaluation_comment}
              isPending={reward.status === 'pending'}
              role={role}
            />
          )}
        </>
      )}
    </div>
  );
}
