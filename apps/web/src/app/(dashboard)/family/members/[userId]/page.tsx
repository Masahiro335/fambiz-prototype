import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import type { GroupMember, JwtPayload, RewardGraphResponse, Goal, Task } from '@fambiz/types';

interface MemberDetailPageProps {
  params: Promise<{ userId: string }>;
}

// JST の現在月を YYYY-MM 形式で返す
function getCurrentMonthJST(): string {
  const now = new Date();
  const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const y = jstDate.getFullYear();
  const m = String(jstDate.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ISO 日付文字列を JST の YYYY-MM 形式に変換する
function toMonthJST(dateStr: string): string {
  const d = new Date(dateStr);
  const jst = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// メンバー詳細ページ（Server Component）
export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { userId } = await params;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合はnullを返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからfamily_group_idを取得する
  let familyGroupId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as {
      family_group_id?: string;
    };
    familyGroupId = metadata.family_group_id ?? null;
  }

  // グループに所属していない場合は一覧へリダイレクトする
  if (!familyGroupId) {
    redirect('/family');
  }

  // メンバー詳細を取得する
  const member = await apiFetch<GroupMember>(
    `/v1/groups/${familyGroupId}/members/${userId}`,
  );

  const user = member.user;

  // アバターの頭文字（avatar_url がない場合に使用）
  const initials = user ? user.name.charAt(0).toUpperCase() : '?';

  // 閲覧対象が子ユーザーの場合のみ月次統計（報酬・タスク達成率・目標達成率）を表示する
  const isViewedMemberChild = user?.role === 'child';

  // 月次統計の行データ型
  type MonthlyRow = {
    targetMonth: string;
    rewardAmount: number;
    completedTasks: number;
    totalTasks: number;
    achievedGoals: number;
    challengedGoals: number;
  };

  let monthlyRows: MonthlyRow[] = [];

  if (isViewedMemberChild) {
    const currentMonth = getCurrentMonthJST();

    // 過去12ヶ月分の報酬グラフデータ・全タスク一覧・全目標一覧を並列取得する
    const [rewardGraph, tasks, goals] = await Promise.all([
      apiFetch<RewardGraphResponse>(
        `/v1/rewards/graph?groupId=${familyGroupId}&childId=${userId}&targetMonth=${currentMonth}&historyMonths=12`,
      ).catch(() => null),
      apiFetch<Task[]>(
        `/v1/tasks?groupId=${familyGroupId}&assigneeId=${userId}`,
      ).catch(() => []),
      apiFetch<Goal[]>(
        `/v1/goals?groupId=${familyGroupId}&assigneeId=${userId}`,
      ).catch(() => []),
    ]);

    // タスクを due_date → start_time → created_at の優先順で JST 月ごとにグループ化する
    const tasksByMonth = new Map<string, Task[]>();
    for (const task of tasks) {
      const refDate = task.due_date ?? task.start_time ?? task.created_at;
      const month = toMonthJST(refDate);
      const bucket = tasksByMonth.get(month) ?? [];
      bucket.push(task);
      tasksByMonth.set(month, bucket);
    }

    // 目標を対象月ごとにグループ化する
    const goalsByMonth = new Map<string, Goal[]>();
    for (const goal of goals) {
      const bucket = goalsByMonth.get(goal.target_month) ?? [];
      bucket.push(goal);
      goalsByMonth.set(goal.target_month, bucket);
    }

    // 報酬グラフデータ・タスク・目標データを結合して月次行データを構築する（新しい月順）
    const months = rewardGraph?.months ?? [];
    monthlyRows = [...months].reverse().map((r) => {
      const monthTasks = tasksByMonth.get(r.target_month) ?? [];
      const monthGoals = goalsByMonth.get(r.target_month) ?? [];
      return {
        targetMonth: r.target_month,
        rewardAmount: r.total_amount,
        completedTasks: monthTasks.filter((t) => t.status === 'completed').length,
        totalTasks: monthTasks.length,
        achievedGoals: monthGoals.filter((g) => g.status === 'achieved').length,
        challengedGoals: monthGoals.filter((g) => g.status !== 'not_started').length,
      };
    });
  }

  // 達成率を「X/Y件（Z%）」形式の文字列に変換する（件数0の場合は「-」）
  function formatRate(achieved: number, total: number): string {
    if (total === 0) return '-';
    return `${achieved}/${total}件（${Math.floor((achieved / total) * 100)}%）`;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">メンバー詳細</h2>

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
        {/* アバター */}
        <div className="flex justify-center mb-4">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={`${user.name}のアバター`}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-3xl">{initials}</span>
            </div>
          )}
        </div>

        {/* 名前 */}
        <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
          {user?.name ?? '-'}
        </h3>

        {/* コメント */}
        {user?.comment && (
          <p className="text-sm text-center text-gray-500 mb-4">
            コメント: {user.comment}
          </p>
        )}

        {/* 閲覧対象が子ユーザーの場合のみ過去12ヶ月の月次統計を表示する（親は非表示） */}
        {isViewedMemberChild && (
          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">年月</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">報酬額</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">タスク達成率</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">目標達成率</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, i) => (
                  <tr key={row.targetMonth} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-800">{row.targetMonth}</td>
                    <td className="px-4 py-3 text-gray-800">
                      ¥{row.rewardAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {formatRate(row.completedTasks, row.totalTasks)}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {formatRate(row.achievedGoals, row.challengedGoals)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 閉じるボタン（家族一覧へ戻る） */}
        <div className="flex justify-center">
          <Link
            href="/family"
            className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            閉じる
          </Link>
        </div>
      </div>
    </div>
  );
}
