import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

// ランディングページ（Server Component）
// ログイン済みユーザーはTOP（家族管理）画面へリダイレクトする
export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/family');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">FamBiz</h1>
        <p className="text-lg text-gray-600 mb-8">家族のお手伝い管理・お小遣い管理アプリ</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            新規登録
          </Link>
        </div>
      </div>
    </main>
  );
}
