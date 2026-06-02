'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// メンバー脱退ページのエラー境界コンポーネント
export default function LeaveError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーログを記録する
    console.error('メンバー脱退ページでエラーが発生しました:', error);
  }, [error]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-6">メンバー退会</h2>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <p className="text-red-600 font-medium mb-2">エラーが発生しました</p>
        <p className="text-sm text-gray-500 mb-4">
          メンバー情報の読み込みに失敗しました。時間をおいて再度お試しください。
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
