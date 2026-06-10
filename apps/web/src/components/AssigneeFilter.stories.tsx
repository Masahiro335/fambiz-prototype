import type { Meta, StoryObj } from '@storybook/react';
import type { GroupMember } from '@fambiz/types';
import { AssigneeFilter } from './AssigneeFilter';

const mockMembers: GroupMember[] = [
  {
    id: 'member-001',
    group_id: 'group-001',
    user_id: 'user-child-001',
    joined_at: '2026-05-01T00:00:00Z',
    user: { id: 'user-child-001', email: 'taro@example.com', name: '太郎', role: 'child', avatar_url: null, comment: null, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  },
  {
    id: 'member-002',
    group_id: 'group-001',
    user_id: 'user-child-002',
    joined_at: '2026-05-01T00:00:00Z',
    user: { id: 'user-child-002', email: 'hanako@example.com', name: '花子', role: 'child', avatar_url: null, comment: null, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  },
  {
    id: 'member-003',
    group_id: 'group-001',
    user_id: 'user-child-003',
    joined_at: '2026-05-01T00:00:00Z',
    user: { id: 'user-child-003', email: 'jiro@example.com', name: '次郎', role: 'child', avatar_url: null, comment: null, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  },
];

const meta = {
  title: 'Components/AssigneeFilter',
  component: AssigneeFilter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/tasks', query: {} },
    },
  },
} satisfies Meta<typeof AssigneeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSelected: Story = {
  name: '全員表示（未選択）',
  args: {
    childMembers: mockMembers,
    selectedAssigneeId: '',
    basePath: '/tasks',
  },
};

export const MemberSelected: Story = {
  name: '担当者選択済み（太郎）',
  args: {
    childMembers: mockMembers,
    selectedAssigneeId: 'user-child-001',
    basePath: '/tasks',
  },
};

export const SingleChild: Story = {
  name: '子が1人のみ',
  args: {
    childMembers: [mockMembers[0]],
    selectedAssigneeId: '',
    basePath: '/goals',
  },
};
