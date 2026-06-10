import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { Task } from '@fambiz/types';
import { TaskSearchModal } from './TaskSearchModal';

const mockTasks: Task[] = [
  {
    id: 'task-001',
    group_id: 'group-001',
    creator_id: 'user-parent',
    assignee_id: 'user-child-001',
    task_name: '部屋の掃除',
    category: '掃除',
    reward_amount: 300,
    status: 'completed',
    start_time: '2026-06-01T09:00:00Z',
    end_time: '2026-06-15T23:59:00Z',
    due_date: '2026-06-15T23:59:00Z',
    memo: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-10T00:00:00Z',
    assignee: { id: 'user-child-001', name: '太郎' } as Task['assignee'],
  },
  {
    id: 'task-002',
    group_id: 'group-001',
    creator_id: 'user-parent',
    assignee_id: 'user-child-001',
    task_name: '夕食の皿洗い',
    category: '料理',
    reward_amount: 150,
    status: 'completed',
    start_time: '2026-06-01T09:00:00Z',
    end_time: '2026-06-30T23:59:00Z',
    due_date: '2026-06-30T23:59:00Z',
    memo: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-05T00:00:00Z',
    assignee: { id: 'user-child-001', name: '太郎' } as Task['assignee'],
  },
  {
    id: 'task-003',
    group_id: 'group-001',
    creator_id: 'user-parent',
    assignee_id: 'user-child-001',
    task_name: '洗濯物を畳む',
    category: '洗濯',
    reward_amount: 200,
    status: 'reported',
    start_time: '2026-06-01T09:00:00Z',
    end_time: '2026-06-30T23:59:00Z',
    due_date: null,
    memo: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-08T00:00:00Z',
    assignee: { id: 'user-child-001', name: '太郎' } as Task['assignee'],
  },
];

const meta = {
  title: 'Components/TaskSearchModal',
  component: TaskSearchModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
  args: {
    groupId: 'group-001',
    onSelect: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof TaskSearchModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  name: '初期状態（検索前）',
  args: {
    groupId: 'group-001',
  },
};

export const WithAssignee: Story = {
  name: '担当者フィルタあり',
  args: {
    groupId: 'group-001',
    assigneeId: 'user-child-001',
  },
};

// 検索結果あり状態をデコレーターで再現する
export const WithResults: Story = {
  name: '検索結果あり（3件）',
  decorators: [
    (Story, context) => {
      // fetch を上書きして検索ボタンクリック後にモックデータを返す
      if (typeof window !== 'undefined') {
        const originalFetch = window.fetch;
        window.fetch = async (input, init) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
          if (url.includes('/v1/tasks')) {
            return new Response(JSON.stringify(mockTasks), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return originalFetch(input, init);
        };
      }
      return <Story {...context} />;
    },
  ],
  args: {
    groupId: 'group-001',
  },
};
