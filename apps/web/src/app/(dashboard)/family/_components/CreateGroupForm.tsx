'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CreateGroupForm() {
  const router = useRouter();

  // グループ名の入力値
  const [groupName, setGroupName] = useState('');

  // UI状態
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // フォーム送信ハンドラ
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    // グループ名の空文字チェック
    if (!groupName.trim()) {
      setErrorMessage('グループ名を入力してください。');
      return;
    }

    setIsLoading(true);

    try {
      // ブラウザ側でSupabaseセッションを取得しアクセストークンを付与する
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage('セッションが無効です。再ログインしてください。');
        return;
      }

      // POST /v1/groups でグループを作成する
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ groupName: groupName.trim() }),
      });

      if (!res.ok) {
        const errorBody = (await res.json()) as { message?: string | string[] };
        const message: string =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : Array.isArray(errorBody.message)
              ? errorBody.message.join(' ')
              : 'グループの作成に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // 作成成功後は /family にリダイレクトしてページを再取得する
      router.push('/family');
      router.refresh();
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
      <h2 className="text-xl font-bold text-gray-800 mb-2">家族グループを作成する</h2>
      <p className="text-sm text-gray-500 mb-6">
        グループを作成して家族を招待しましょう。
      </p>

      {/* エラーメッセージ表示エリア */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* グループ名入力フィールド */}
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
            グループ名
          </label>
          <input
            id="groupName"
            type="text"
            required
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="例：山田家"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '作成中...' : 'グループを作成する'}
        </button>
      </form>
    </div>
  );
}
