import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleById } from '@/lib/articles';

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = getArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/articles"
        className="text-sm text-green-600 hover:text-green-800 inline-flex items-center gap-1 mb-6"
      >
        ← 記事一覧に戻る
      </Link>

      <div className="mt-4">
        <div className="text-4xl mb-4">{article.iconEmoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{article.title}</h1>
        <div className="space-y-4 text-gray-700 leading-relaxed">
          {article.content.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
