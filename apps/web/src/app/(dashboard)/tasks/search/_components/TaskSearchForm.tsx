'use client';

import { useRouter } from 'next/navigation';

interface TaskSearchFormProps {
  defaultValues: {
    keyword?: string;
    status?: string;
    category?: string;
  };
}

// タスク検索フォームコンポーネント（クライアントコンポーネント）
export function TaskSearchForm({ defaultValues }: TaskSearchFormProps) {
  const router = useRouter();

  // フォーム送信時にURLクエリパラメータを更新する
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const keyword = formData.get('keyword');
    const category = formData.get('category');
    const status = formData.get('status');

    // 空文字・「全て」は除外してURLをシンプルに保つ
    if (keyword && typeof keyword === 'string' && keyword.trim() !== '') {
      params.set('keyword', keyword.trim());
    }
    if (category && typeof category === 'string' && category !== '') {
      params.set('category', category);
    }
    if (status && typeof status === 'string' && status !== '') {
      params.set('status', status);
    }

    const queryString = params.toString();
    router.push('/tasks/search' + (queryString ? '?' + queryString : ''));
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* タスク名キーワード入力 */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
            タスク名
          </label>
          <input
            type="text"
            id="keyword"
            name="keyword"
            defaultValue={defaultValues.keyword ?? ''}
            placeholder="キーワードを入力"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 分類セレクト */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            分類
          </label>
          <select
            id="category"
            name="category"
            defaultValue={defaultValues.category ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">全て</option>
            <option value="掃除">掃除</option>
            <option value="料理">料理</option>
            <option value="洗濯">洗濯</option>
            <option value="その他">その他</option>
          </select>
        </div>

        {/* ステータスセレクト */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues.status ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">全て</option>
            <option value="pending">未対応</option>
            <option value="reported">対応済</option>
            <option value="completed">完了</option>
          </select>
        </div>
      </div>

      {/* 検索ボタン */}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          検索する
        </button>
      </div>
    </form>
  );
}
