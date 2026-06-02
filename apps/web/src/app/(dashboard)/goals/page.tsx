import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { GoalList } from './_components/GoalList';
import type { Goal, JwtPayload, Task } from '@fambiz/types';

// JST（UTC+9）の現在月を YYYY-MM 形式で返す
function getDefaultMonth(): string {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 目標一覧ページ（Server Component）
export default async function GoalsPage() {
  // 当月（JST）をデフォルトの対象月とする
  const currentMonth = getDefaultMonth();

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからユーザーのロールとfamily_group_idを取得する
  let role: string | null = null;
  let familyGroupId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    role = payload.role ?? null;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as {
      role?: string;
      family_group_id?: string;
    };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
  }

  // グループ未参加の場合はメッセージを表示する
  if (!familyGroupId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-6">目標</h2>
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            グループに参加してください
          </h3>
          <p className="text-sm text-gray-500">
            目標を確認するには家族グループへの参加が必要です。
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

  // 当月の目標一覧を取得する
  let goals: Goal[] = [];
  try {
    goals = await apiFetch<Goal[]>(
      `/v1/goals?groupId=${familyGroupId}&targetMonth=${currentMonth}`,
    );
  } catch {
    // APIエラー時は空のリストとして扱う（エラー境界に委譲しない）
    goals = [];
  }

  // 目標に紐づくタスク名を表示するため、グループのタスク一覧を取得してIDと名前のマップを作る
  let taskNameMap: Record<string, string> = {};
  const linkedTaskIds = goals.map((g) => g.task_id).filter((id): id is string => id !== null);
  if (linkedTaskIds.length > 0) {
    try {
      const tasks = await apiFetch<Task[]>(`/v1/tasks?groupId=${familyGroupId}`);
      taskNameMap = Object.fromEntries(tasks.map((t) => [t.id, t.task_name]));
    } catch {
      // タスク取得失敗時はタスク名を空表示にする
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">目標</h2>
        {/* 親ユーザーのみ「目標を登録」ボタンを表示する */}
        {role === 'parent' && (
          <Link
            href="/goals/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 目標を登録
          </Link>
        )}
      </div>

      {/* 対象月の表示 */}
      <p className="text-sm text-gray-500 mb-4">
        {currentMonth.replace('-', '年')}月の目標
      </p>

      {/* 目標一覧コンポーネント */}
      <GoalList goals={goals} taskNameMap={taskNameMap} />
    </div>
  );
}
