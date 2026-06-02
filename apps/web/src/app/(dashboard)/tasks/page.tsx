import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { TaskCalendar } from './_components/TaskCalendar';
import type { Task, JwtPayload } from '@fambiz/types';

// JST（UTC+9）の現在月を YYYY-MM 形式で返す
function getDefaultMonth(): string {
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

// タスクカレンダーページ（Server Component）
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;

  // 月パラメータが未指定の場合は現在月（JST）をデフォルトにする
  const currentMonth = monthParam ?? getDefaultMonth();

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
        <h2 className="text-2xl font-bold text-black mb-6">タスク</h2>
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            グループに参加してください
          </h3>
          <p className="text-sm text-gray-500">
            タスクを確認するには家族グループへの参加が必要です。
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

  // 当月のタスク一覧を取得する（month パラメータを渡す）
  let tasks: Task[] = [];
  try {
    tasks = await apiFetch<Task[]>(
      `/v1/tasks?groupId=${familyGroupId}&month=${currentMonth}`,
    );
  } catch {
    // APIエラー時は空のリストとして扱う（エラー境界に委譲しない）
    tasks = [];
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">タスク</h2>
        {/* 親ユーザーのみ「タスクを登録」ボタンを表示する */}
        {role === 'parent' && (
          <Link
            href="/tasks/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            + タスクを登録
          </Link>
        )}
      </div>

      {/* カレンダーコンポーネントにタスク・月・ロールを渡す */}
      <TaskCalendar tasks={tasks} month={currentMonth} role={role} />
    </div>
  );
}
