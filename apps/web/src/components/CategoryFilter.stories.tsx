import type { Meta, StoryObj } from '@storybook/react';
import { CategoryFilter } from './CategoryFilter';

const meta = {
  title: 'Components/CategoryFilter',
  component: CategoryFilter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/articles', query: {} },
    },
  },
} satisfies Meta<typeof CategoryFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoneSelected: Story = {
  name: '全カテゴリ未選択',
  args: { selectedCategories: [] },
};

export const OneSelected: Story = {
  name: '「お金」のみ選択',
  args: { selectedCategories: ['お金'] },
};

export const TwoSelected: Story = {
  name: '「仕事」「社会」選択',
  args: { selectedCategories: ['仕事', '社会'] },
};

export const AllSelected: Story = {
  name: '全カテゴリ選択',
  args: { selectedCategories: ['お金', '仕事', '社会'] },
};
