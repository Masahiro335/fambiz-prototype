'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// グループ参加ページのエラー境界コンポーネント
export default function JoinError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーログを記録する
    console.error('グループ参加ページでエラーが発生しました:', error);
  }, [error]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">グループに参加する</h2>
      <div className="bg-red-50 rounded-xl border border-red-200 p-6 max-w-md">
        <p className="text-red-700 font-medium mb-2">エラーが発生しました</p>
        <p className="text-sm text-red-600 mb-4">
          グループ情報の取得に失敗しました。時間をおいて再度お試しください。
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            もう一度試す
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
