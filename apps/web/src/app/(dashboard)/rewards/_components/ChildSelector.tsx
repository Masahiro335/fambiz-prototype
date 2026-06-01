'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { GroupMember } from '@fambiz/types';

interface ChildSelectorProps {
  childMembers: GroupMember[];
  selectedChildId: string;
}

// 子ユーザー選択セレクトコンポーネント（親ユーザー向け）
// クエリパラメータ childId を変更してページを再レンダリングする
export function ChildSelector({ childMembers, selectedChildId }: ChildSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (childId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('childId', childId);
      router.push(`/rewards?${params.toString()}`);
    },
    [router, searchParams],
  );

  if (childMembers.length === 0) {
    return null;
  }

  // 子が1人の場合はセレクトを表示しない
  if (childMembers.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">子:</span>
        <span className="text-sm font-medium text-gray-700">
          {childMembers[0].user?.name ?? '不明'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="child-select" className="text-sm text-gray-500">
        子を選択:
      </label>
      <select
        id="child-select"
        value={selectedChildId}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {childMembers.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.user?.name ?? member.user_id}
          </option>
        ))}
      </select>
    </div>
  );
}
