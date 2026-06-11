import type { Meta, StoryObj } from '@storybook/react';
import { MonthNavigator } from './MonthNavigator';

const meta = {
  title: 'Components/MonthNavigator',
  component: MonthNavigator,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    // useRouter / useSearchParams を @storybook/nextjs のモックで処理する
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/rewards',
        query: {},
      },
    },
  },
} satisfies Meta<typeof MonthNavigator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CurrentMonth: Story = {
  name: '当月表示（「今月」ボタンなし）',
  args: {
    currentMonth: '2026-06',
    todayMonth: '2026-06',
    basePath: '/rewards',
  },
};

export const PastMonth: Story = {
  name: '過去月表示（「今月」ボタンあり）',
  args: {
    currentMonth: '2026-03',
    todayMonth: '2026-06',
    basePath: '/rewards',
  },
};

export const FutureMonth: Story = {
  name: '未来月表示（「今月」ボタンあり）',
  args: {
    currentMonth: '2026-09',
    todayMonth: '2026-06',
    basePath: '/goals',
  },
};

export const YearBoundary: Story = {
  name: '年をまたぐ表示（2025年12月）',
  args: {
    currentMonth: '2025-12',
    todayMonth: '2026-06',
    basePath: '/rewards',
  },
};
