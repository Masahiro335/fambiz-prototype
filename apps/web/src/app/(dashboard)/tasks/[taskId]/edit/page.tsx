import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { EditTaskForm } from './_components/EditTaskForm';
import { getPaidMonths } from '../../_lib/getPaidMonths';
import type { Task, JwtPayload } from '@fambiz/types';

// タスク編集ページ（Server Component）
// 親ユーザーのみアクセス可能。childがアクセスした場合はタスク一覧へリダイレクトする。
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからロールと家族グループIDを取得する
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
    const metadata = session.user.user_metadata as { role?: string; family_group_id?: string };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
  }

  // childの場合はタスク一覧へリダイレクトする
  if (role === 'child') {
    redirect('/tasks');
  }

  // グループ未参加の場合はタスク一覧へリダイレクトする
  if (!familyGroupId) {
    redirect('/tasks');
  }

  // 既存タスクを取得する
  let task: Task | null = null;
  try {
    task = await apiFetch<Task>(`/v1/tasks/${taskId}`);
  } catch {
    // タスクが取得できない場合はタスク一覧へリダイレクトする
    redirect('/tasks');
  }

  if (!task) {
    redirect('/tasks');
  }

  const paidMonths = await getPaidMonths(familyGroupId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">タスクを編集</h2>
      <EditTaskForm task={task} familyGroupId={familyGroupId} paidMonths={paidMonths} />
    </div>
  );
}
