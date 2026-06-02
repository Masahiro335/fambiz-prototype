import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { HeaderNav } from './_components/HeaderNav';
import type { JwtPayload } from '@fambiz/types';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // JWTからユーザー名とロールを取得する
  let userName = '';
  let role: 'parent' | 'child' = 'child';
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1])) as Partial<JwtPayload>;
    userName = payload.name ?? '';
    role = payload.role ?? 'child';
  } catch {
    const metadata = session.user.user_metadata as { name?: string; role?: string };
    userName = metadata.name ?? '';
    role = (metadata.role as 'parent' | 'child') ?? 'child';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600 shrink-0">
            FamBiz
          </Link>
          <HeaderNav userName={userName} role={role} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 w-full flex-1">{children}</main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-end gap-6">
          <span className="text-xs text-gray-400">利用規約</span>
          <span className="text-xs text-gray-400">プライバシーポリシー</span>
          <span className="text-xs text-gray-400">お問い合わせ</span>
        </div>
      </footer>
    </div>
  );
}
