'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { ArticleCategory } from '@/lib/articles';

const CATEGORIES: ArticleCategory[] = ['お金', '仕事', '社会'];

const CATEGORY_COLORS: Record<ArticleCategory, { active: string; inactive: string }> = {
  お金: { active: 'bg-yellow-400 text-yellow-900', inactive: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  仕事: { active: 'bg-blue-500 text-white', inactive: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
  社会: { active: 'bg-purple-500 text-white', inactive: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
};

interface CategoryFilterProps {
  selectedCategories: ArticleCategory[];
}

export function CategoryFilter({ selectedCategories }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggleCategory = useCallback(
    (category: ArticleCategory) => {
      const current = new Set(selectedCategories);
      if (current.has(category)) {
        current.delete(category);
      } else {
        current.add(category);
      }
      const params = new URLSearchParams(searchParams.toString());
      if (current.size > 0) {
        params.set('category', Array.from(current).join(','));
      } else {
        params.delete('category');
      }
      router.push(`/articles?${params.toString()}`);
    },
    [router, searchParams, selectedCategories],
  );

  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => toggleCategory(category)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategories.includes(category)
              ? CATEGORY_COLORS[category].active
              : CATEGORY_COLORS[category].inactive
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
