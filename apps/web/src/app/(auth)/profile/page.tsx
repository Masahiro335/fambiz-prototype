'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UpdateUserDto, User } from '@fambiz/types';

// ロール表示用ラベルマッピング
const ROLE_LABELS: Record<string, string> = {
  parent: '親',
  child: '子',
};

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  // フォーム入力値の状態管理
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [roleLabel, setRoleLabel] = useState('');

  // UI状態
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 初期化: Supabaseセッションから現在のユーザー情報を取得する
  useEffect(() => {
    async function initializeProfile() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 未認証の場合はログイン画面へリダイレクト
        router.push('/login');
        return;
      }

      setAccessToken(session.access_token);

      // NestJS APIからユーザー情報を取得する
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/me`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const user = (await res.json()) as User;
          setName(user.name ?? '');
          setComment(user.comment ?? '');
          setRoleLabel(ROLE_LABELS[user.role] ?? user.role);
        } else {
          // APIからの取得に失敗した場合はJWTクレームから取得する
          const payload = JSON.parse(atob(session.access_token.split('.')[1])) as {
            name?: string;
            role?: string;
          };
          setName(payload.name ?? '');
          setRoleLabel(ROLE_LABELS[payload.role ?? ''] ?? payload.role ?? '');
        }
      } catch {
        // エラー時はJWTクレームからフォールバックする
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1])) as {
            name?: string;
            role?: string;
          };
          setName(payload.name ?? '');
          setRoleLabel(ROLE_LABELS[payload.role ?? ''] ?? payload.role ?? '');
        } catch {
          // JWTのパースにも失敗した場合は空のまま続行する
        }
      } finally {
        setIsInitializing(false);
      }
    }

    void initializeProfile();
  }, [router]);

  // フォーム送信ハンドラ
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!accessToken) {
      setErrorMessage('セッションが無効です。再ログインしてください。');
      return;
    }

    setIsLoading(true);

    try {
      const body: UpdateUserDto = {
        name,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = await res.json();
        const message: string =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : 'プロフィールの更新に失敗しました。';
        setErrorMessage(message);
        return;
      }

      // next パラメータがあればそこへ、なければ家族管理画面へリダイレクト
      router.push(next && next.startsWith('/') ? next : '/family');
    } catch {
      setErrorMessage('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }

  // 初期化中はスケルトン表示
  if (isInitializing) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">プロフィール登録</h2>
      <p className="text-sm text-gray-500 mb-6">プロフィール情報を入力してください。</p>

      {/* エラーメッセージ表示エリア */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 名前（変更可） */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            名前
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：田中 太郎"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* コメント（任意） */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            コメント
            <span className="text-gray-400 font-normal ml-1">（任意）</span>
          </label>
          <textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ひとことメッセージを入力"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 親子区分（変更不可・表示のみ） */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1">親子区分</p>
          <div className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600">
            {roleLabel || '取得中...'}
          </div>
          <p className="text-xs text-gray-400 mt-1">親子区分は登録後に変更できません。</p>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '保存中...' : 'プロフィールを保存してはじめる'}
        </button>
      </form>
    </>
  );
}
