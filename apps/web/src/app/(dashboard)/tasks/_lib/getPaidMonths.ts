import { apiFetch } from '@/lib/api/fetcher';
import type { GroupMember, Reward } from '@fambiz/types';

// グループの過去12か月分の支払い済み月一覧を返す（Server Component専用）
export async function getPaidMonths(familyGroupId: string): Promise<string[]> {
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
