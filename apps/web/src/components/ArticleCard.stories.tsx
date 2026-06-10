import type { Meta, StoryObj } from '@storybook/react';
import type { Article } from '@/lib/articles';
import { ArticleCard } from './ArticleCard';

const meta = {
  title: 'Components/ArticleCard',
  component: ArticleCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof ArticleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArticle: Article = {
  id: '1',
  title: '仕事の種類',
  category: '仕事',
  iconEmoji: '💼',
  createdAt: '2026-01-15T09:00:00+09:00',
  content: '世の中にはさまざまな仕事があります。',
};

export const Work: Story = {
  name: '仕事カテゴリ',
  args: { article: { ...baseArticle, category: '仕事', iconEmoji: '💼', title: '仕事の種類' } },
};

export const Money: Story = {
  name: 'お金カテゴリ',
  args: {
    article: {
      ...baseArticle,
      id: '2',
      category: 'お金',
      iconEmoji: '💰',
      title: 'お金の使い方と貯め方',
    },
  },
};

export const Society: Story = {
  name: '社会カテゴリ',
  args: {
    article: {
      ...baseArticle,
      id: '3',
      category: '社会',
      iconEmoji: '🌏',
      title: '社会のルールとマナー',
    },
  },
};

export const LongTitle: Story = {
  name: '長いタイトル',
  args: {
    article: {
      ...baseArticle,
      title: '税金ってなんだろう？消費税・所得税・住民税をわかりやすく説明します',
      category: 'お金',
      iconEmoji: '📊',
    },
  },
};
