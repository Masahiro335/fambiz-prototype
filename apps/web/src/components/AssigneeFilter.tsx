'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { GroupMember } from '@fambiz/types';

interface AssigneeFilterProps {
  childMembers: GroupMember[];
  selectedAssigneeId: string;
  /** 遷移先のベースパス（例: '/tasks', '/goals'） */
  basePath: string;
}

// 担当者フィルタセレクトコンポーネント（親ユーザー向け）
// クエリパラメータ assigneeId を変更してページを再レンダリングする
export function AssigneeFilter({ childMembers, selectedAssigneeId, basePath }: AssigneeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (assigneeId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (assigneeId) {
        params.set('assigneeId', assigneeId);
      } else {
        params.delete('assigneeId');
      }
      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath],
  );

  if (childMembers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="assignee-filter" className="text-sm text-gray-500">
        担当者:
      </label>
      <select
        id="assignee-filter"
        value={selectedAssigneeId}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">全員</option>
        {childMembers.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.user?.name ?? member.user_id}
          </option>
        ))}
      </select>
    </div>
  );
}
