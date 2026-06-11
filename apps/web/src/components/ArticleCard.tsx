import Link from 'next/link';
import type { Article } from '@/lib/articles';

const CATEGORY_COLORS: Record<string, string> = {
  お金: 'bg-yellow-100 text-yellow-800',
  仕事: 'bg-blue-100 text-blue-800',
  社会: 'bg-purple-100 text-purple-800',
};

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link href={`/articles/${article.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow cursor-pointer flex items-start gap-4">
        <div className="text-3xl flex-shrink-0">{article.iconEmoji}</div>
        <div>
          <h3 className="font-semibold text-gray-900">{article.title}</h3>
          <span
            className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[article.category] ?? ''}`}
          >
            {article.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
