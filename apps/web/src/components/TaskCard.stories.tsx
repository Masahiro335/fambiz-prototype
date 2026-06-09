import type { Meta, StoryObj } from '@storybook/react';
import type { Task } from '@fambiz/types';
import { TaskCard } from './TaskCard';

const baseTask: Task = {
  id: 'task-001',
  group_id: 'group-001',
  creator_id: 'user-parent',
  assignee_id: 'user-child',
  task_name: '部屋の掃除',
  category: '掃除',
  reward_amount: 300,
  status: 'pending',
  start_time: '2026-06-01T09:00:00Z',
  end_time: '2026-06-30T23:59:00Z',
  due_date: '2026-06-30T23:59:00Z',
  memo: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

const meta = {
  title: 'Components/TaskCard',
  component: TaskCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof TaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  name: '未対応',
  args: { task: { ...baseTask, status: 'pending' } },
};

export const Reported: Story = {
  name: '対応済（承認待ち）',
  args: { task: { ...baseTask, status: 'reported' } },
};

export const Completed: Story = {
  name: '完了',
  args: { task: { ...baseTask, status: 'completed' } },
};

export const Cancelled: Story = {
  name: 'キャンセル',
  args: { task: { ...baseTask, status: 'cancelled' } },
};

export const Expired: Story = {
  name: '期限切れ',
  args: {
    task: {
      ...baseTask,
      status: 'expired',
      due_date: '2026-05-01T23:59:00Z',
    },
  },
};

export const WithEditLink: Story = {
  name: '編集リンクあり（親ビュー）',
  args: {
    task: { ...baseTask, status: 'pending' },
    editHref: '/tasks/task-001/edit',
  },
};

export const NoDueDate: Story = {
  name: '期日なし',
  args: { task: { ...baseTask, due_date: null } },
};

export const NoCategoryLongName: Story = {
  name: '分類なし・長いタスク名',
  args: {
    task: {
      ...baseTask,
      category: null,
      task_name: '今月中に家族全員分の衣替えを完了させてクローゼットを整理する',
    },
  },
};

export const HighReward: Story = {
  name: '高額報酬（料理）',
  args: {
    task: {
      ...baseTask,
      task_name: '夕食をフルコースで作る',
      category: '料理',
      reward_amount: 1500,
    },
  },
};
