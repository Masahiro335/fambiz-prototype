'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// タスク詳細ページのエラー境界コンポーネント（Client Component）
export default function TaskDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーをコンソールに記録する（本番環境では外部サービスへ送信することを検討する）
    console.error('タスク詳細の取得中にエラーが発生しました:', error);
  }, [error]);

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          タスクの取得に失敗しました
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          タスクの詳細情報を読み込めませんでした。時間をおいて再度お試しください。
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
          <Link
            href="/tasks"
            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            タスク一覧へ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
