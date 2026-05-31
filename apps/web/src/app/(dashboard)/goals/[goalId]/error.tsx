'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// 目標詳細ページのエラー境界コンポーネント
export default function GoalDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーログを記録する
    console.error('目標詳細ページでエラーが発生しました:', error);
  }, [error]);

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">目標詳細</h2>
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <p className="text-red-600 font-medium mb-2">エラーが発生しました</p>
        <p className="text-sm text-gray-500 mb-4">
          データの読み込みに失敗しました。時間をおいて再度お試しください。
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          再試行する
        </button>
      </div>
    </div>
  );
}
