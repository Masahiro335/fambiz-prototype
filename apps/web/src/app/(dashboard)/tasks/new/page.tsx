import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { CreateTaskForm } from '../_components/CreateTaskForm';
import type { JwtPayload, GroupMember, Reward } from '@fambiz/types';

// グループの過去12か月分の支払い済み月一覧を取得する
async function getPaidMonths(familyGroupId: string): Promise<string[]> {
  // 過去12か月分の YYYY-MM 文字列を生成する
  const now = new Date();
  const recentMonths: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    recentMonths.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  try {
    const allMembers = await apiFetch<GroupMember[]>(`/v1/groups/${familyGroupId}/members`);
    const childMembers = allMembers.filter((m) => m.user?.role === 'child');
    if (childMembers.length === 0) return [];

    // 全子ユーザー × 全月を並列でフェッチする
    const results = await Promise.allSettled(
      childMembers.flatMap((child) =>
        recentMonths.map((month) =>
          apiFetch<Reward>(
            `/v1/rewards?groupId=${familyGroupId}&childId=${child.user_id}&targetMonth=${month}`,
          ),
        ),
      ),
    );

    const paidSet = new Set<string>();
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.status === 'paid') {
        paidSet.add(result.value.target_month);
      }
    });
    return Array.from(paidSet);
  } catch {
    return [];
  }
}

// タスク新規登録ページ（Server Component）
// 親ユーザーのみアクセス可能。childがアクセスした場合はタスク一覧へリダイレクトする。
export default async function NewTaskPage() {
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

  const paidMonths = await getPaidMonths(familyGroupId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">タスクを登録</h2>
      <CreateTaskForm groupId={familyGroupId} paidMonths={paidMonths} />
    </div>
  );
}
