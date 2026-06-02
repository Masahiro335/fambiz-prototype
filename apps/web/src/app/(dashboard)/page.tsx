import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import type { JwtPayload } from '@fambiz/types';

interface MenuButton {
  label: string;
  href: string;
  disabled?: boolean;
}

interface MenuSection {
  title: string;
  buttons: MenuButton[];
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  let role: string | null = null;
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1])) as Partial<JwtPayload>;
    role = payload.role ?? null;
  } catch {
    const metadata = session.user.user_metadata as { role?: string };
    role = metadata.role ?? null;
  }

  const isParent = role === 'parent';

  const sections: MenuSection[] = [
    {
      title: 'タスク',
      buttons: [
        { label: 'タスク一覧', href: '/tasks' },
        ...(isParent ? [{ label: 'タスク新規登録', href: '/tasks/new' }] : []),
      ],
    },
    {
      title: '目標',
      buttons: [
        { label: '目標一覧', href: '/goals' },
        ...(isParent ? [{ label: '目標新規登録', href: '/goals/new' }] : []),
      ],
    },
    {
      title: '報酬',
      buttons: [
        { label: '報酬管理', href: '/rewards' },
        { label: '報酬グラフ', href: '/rewards/graph' },
      ],
    },
    {
      title: '記事',
      buttons: [{ label: '記事一覧', href: '#', disabled: true }],
    },
    {
      title: '家族',
      buttons: [
        { label: 'メンバー一覧', href: '/family' },
        ...(isParent ? [{ label: 'メンバー招待', href: '/family/invite' }] : []),
      ],
    },
  ];

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">メニュー</h2>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-3">{section.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              {section.buttons.map((btn) =>
                btn.disabled ? (
                  <span
                    key={btn.label}
                    className="flex items-center justify-center py-3 px-4 bg-gray-50 text-gray-400 font-medium rounded-lg text-sm cursor-not-allowed"
                    title="本番版でご利用いただけます"
                  >
                    {btn.label}
                  </span>
                ) : (
                  <Link
                    key={btn.href}
                    href={btn.href}
                    className="flex items-center justify-center py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg text-sm transition-colors"
                  >
                    {btn.label}
                  </Link>
                ),
              )}
              {/* 奇数ボタンのレイアウト調整 */}
              {section.buttons.length % 2 === 1 && <div />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
