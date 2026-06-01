import Link from 'next/link';
import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { YearSelector } from './_components/YearSelector';
import { GraphChildSelector } from './_components/GraphChildSelector';
import { RewardLineChart } from './_components/RewardLineChart';
import { RewardHistoryTable } from './_components/RewardHistoryTable';
import type { RewardGraphResponse, GroupMember, JwtPayload } from '@fambiz/types';

// JST（UTC+9）の現在年を返す
function getCurrentYear(): number {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.getUTCFullYear();
}

// 選択年の報酬グラフAPIクエリパラメータを計算する
// 常に12ヶ月分を取得し、未来月は0円として扱う
function buildGraphParams(year: number): { targetMonth: string; historyMonths: number } {
  return {
    targetMonth: `${year}-12`,
    historyMonths: 12,
  };
}

interface RewardGraphPageProps {
  searchParams: Promise<{ year?: string; childId?: string }>;
}

// 報酬グラフ確認画面（SCR-REWARD-002）
export default async function RewardGraphPage({ searchParams }: RewardGraphPageProps) {
  const { year: yearParam, childId } = await searchParams;
  const currentYear = getCurrentYear();

  // 利用可能な年度リスト（2024年〜現在年）
  const baseYear = 2024;
  const availableYears = Array.from(
    { length: currentYear - baseYear + 1 },
    (_, i) => currentYear - i,
  );

  const selectedYear = yearParam ? Number(yearParam) : currentYear;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

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
    const metadata = session.user.user_metadata as {
      role?: string;
      family_group_id?: string;
    };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
    userId = session.user.id;
  }

  if (!familyGroupId) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">報酬グラフ</h2>
        <div className="bg-white rounded-xl shadow-sm border p-10 max-w-md text-center">
          <p className="text-sm text-gray-500 mb-4">
            報酬グラフを確認するには家族グループへの参加が必要です。
          </p>
          <Link
            href="/family"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            家族管理へ
          </Link>
        </div>
      </div>
    );
  }

  let childMembers: GroupMember[] = [];
  if (role === 'parent') {
    try {
      const allMembers = await apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`);
      childMembers = allMembers.filter((m) => m.user?.role === 'child');
    } catch {
      // メンバー取得失敗時は空のリストとして扱う
    }
  }

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

  // グラフデータを取得する
  let graphData: RewardGraphResponse | null = null;
  if (targetChildId) {
    try {
      const { targetMonth, historyMonths } = buildGraphParams(selectedYear);
      graphData = await apiFetch<RewardGraphResponse>(
        `/v1/rewards/graph?groupId=${familyGroupId}&childId=${targetChildId}&targetMonth=${targetMonth}&historyMonths=${historyMonths}`,
      );
    } catch {
      // APIエラー時はnullのまま扱う
    }
  }

  return (
    <div>
      {/* ページヘッダーとナビゲーション */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">報酬グラフ</h2>
        <Link
          href="/rewards"
          className="text-sm text-blue-600 hover:underline"
        >
          ← 月次報酬管理へ
        </Link>
      </div>

      {/* フィルター行 */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Suspense fallback={<div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />}>
          <YearSelector selectedYear={selectedYear} availableYears={availableYears} />
        </Suspense>

        {role === 'parent' && childMembers.length > 0 && (
          <Suspense fallback={<div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />}>
            <GraphChildSelector
              childMembers={childMembers}
              selectedChildId={targetChildId ?? ''}
            />
          </Suspense>
        )}
      </div>

      {/* グループに子ユーザーがいない場合（親のみ） */}
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

      {/* グラフとテーブル */}
      {targetChildId && graphData && graphData.months.length > 0 ? (
        <>
          <Suspense fallback={<div className="h-80 bg-gray-100 rounded animate-pulse mb-6" />}>
            <RewardLineChart months={graphData.months} />
          </Suspense>
          <RewardHistoryTable months={graphData.months} />
        </>
      ) : (
        targetChildId && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <p className="text-sm text-gray-500">
              {selectedYear}年のデータはまだありません。
            </p>
          </div>
        )
      )}
    </div>
  );
}
