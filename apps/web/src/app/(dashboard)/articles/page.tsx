import { Suspense } from 'react';
import { getArticles } from '@/lib/articles';
import { ArticleCard } from '@/components/ArticleCard';
import { CategoryFilter } from '@/components/CategoryFilter';
import type { ArticleCategory } from '@/lib/articles';

const ALL_CATEGORIES: ArticleCategory[] = ['お金', '仕事', '社会'];

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const selectedCategories: ArticleCategory[] = category
    ? (category
        .split(',')
        .filter((c) => ALL_CATEGORIES.includes(c as ArticleCategory)) as ArticleCategory[])
    : [];

  const articles = getArticles(selectedCategories.length > 0 ? selectedCategories : undefined);

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">記事一覧</h2>

      <div className="mb-4">
        <Suspense fallback={<div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />}>
          <CategoryFilter selectedCategories={selectedCategories} />
        </Suspense>
      </div>

      <p className="text-sm text-gray-500 mb-4">{articles.length}件</p>

      <div className="space-y-8">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
        {articles.length === 0 && (
          <p className="text-gray-500 text-sm py-8 text-center">
            該当する記事がありません。
          </p>
        )}
      </div>
    </div>
  );
}
