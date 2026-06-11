import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { TaskSearchForm } from './_components/TaskSearchForm';
import { TaskSearchResults } from './_components/TaskSearchResults';
import type { GroupMember, Task, JwtPayload } from '@fambiz/types';

interface SearchPageProps {
  searchParams: Promise<{
    keyword?: string;
    status?: string;
    category?: string;
    assigneeId?: string;
  }>;
}

// タスク検索ページ（サーバーコンポーネント）
export default async function TaskSearchPage({ searchParams }: SearchPageProps) {
  const { keyword, status, category, assigneeId } = await searchParams;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからfamily_group_idとロールを取得する
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

  // グループ未参加の場合はメッセージを表示する
  if (!familyGroupId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-6">タスク検索</h2>
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
            タスクを検索するには家族グループへの参加が必要です。
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

  // 親ユーザーの場合は子メンバー一覧を取得する（担当者フィルタUI用）
  let childMembers: GroupMember[] = [];
  if (role === 'parent') {
    try {
      const allMembers = await apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`);
      childMembers = allMembers.filter((m) => m.user?.role === 'child');
    } catch {
      // メンバー取得失敗時は空のリストとして扱う
    }
  }

  // 有効な担当者IDを決定する
  // 子ロールの場合: 自分のID（APIサーバー側でも強制するがフロントでも明示する）
  // 親ロールの場合: クエリパラメータ assigneeId（未指定なら全員表示）
  const effectiveAssigneeId = role === 'child' ? userId : (assigneeId ?? '');

  // クエリパラメータからAPIリクエストURLを組み立てる
  const queryParams = new URLSearchParams({ groupId: familyGroupId });
  if (keyword) queryParams.set('keyword', keyword);
  if (status) queryParams.set('status', status);
  if (category) queryParams.set('category', category);
  if (effectiveAssigneeId) queryParams.set('assigneeId', effectiveAssigneeId);

  // タスク一覧をAPIから取得する
  let tasks: Task[] = [];
  try {
    tasks = await apiFetch<Task[]>(`/v1/tasks?${queryParams.toString()}`);
  } catch {
    // APIエラー時は空のリストとして扱う（error.tsx に委譲しない）
    tasks = [];
  }

  // 現在のフィルタ値を検索フォームの初期値として渡す
  const defaultValues = { keyword, status, category, assigneeId };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">タスク検索</h2>

      {/* 検索フォーム（クライアントコンポーネント） */}
      <TaskSearchForm
        defaultValues={defaultValues}
        childMembers={childMembers}
        role={role}
      />

      {/* 検索結果テーブル */}
      <TaskSearchResults tasks={tasks} role={role} />
    </div>
  );
}
