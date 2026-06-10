import type { Meta, StoryObj } from '@storybook/react';
import { GoalProgress } from './GoalProgress';

const meta = {
  title: 'Components/GoalProgress',
  component: GoalProgress,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    rate: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: '進捗率（0〜100）',
    },
  },
} satisfies Meta<typeof GoalProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = {
  name: '0%（未着手）',
  args: { rate: 0 },
};

export const Low: Story = {
  name: '25%（低進捗）',
  args: { rate: 25 },
};

export const Half: Story = {
  name: '50%（中進捗・青色）',
  args: { rate: 50 },
};

export const High: Story = {
  name: '75%（高進捗）',
  args: { rate: 75 },
};

export const Complete: Story = {
  name: '100%（達成・緑色）',
  args: { rate: 100 },
};

export const Overflow: Story = {
  name: '120%（上限クランプ確認）',
  args: { rate: 120 },
};
