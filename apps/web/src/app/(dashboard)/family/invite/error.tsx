'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// 招待ページのエラー境界コンポーネント
export default function InviteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーログを記録する
    console.error('招待ページでエラーが発生しました:', error);
  }, [error]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">メンバー招待</h2>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-sm">
        <p className="text-red-600 font-medium mb-2">エラーが発生しました</p>
        <p className="text-sm text-gray-500 mb-4">
          招待コードの取得に失敗しました。時間をおいて再度お試しください。
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行する
          </button>
          <Link
            href="/family"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
