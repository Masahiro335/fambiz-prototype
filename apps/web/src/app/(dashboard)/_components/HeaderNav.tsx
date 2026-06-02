'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SubItem {
  label: string;
  href: string;
  disabled?: boolean;
  parentOnly?: boolean;
}

interface NavItem {
  label: string;
  href: string | null;
  subItems: SubItem[];
}

const buildNavItems = (isParent: boolean): NavItem[] => [
  {
    label: 'タスク',
    href: '/tasks',
    subItems: [
      { label: 'タスク一覧', href: '/tasks' },
      { label: 'タスク新規登録', href: '/tasks/new', parentOnly: true },
      { label: 'タスク検索', href: '/tasks/search' },
    ].filter((item) => !item.parentOnly || isParent),
  },
  {
    label: '目標',
    href: '/goals',
    subItems: [
      { label: '目標一覧', href: '/goals' },
      { label: '目標新規登録', href: '/goals/new', parentOnly: true },
    ].filter((item) => !item.parentOnly || isParent),
  },
  {
    label: '報酬',
    href: '/rewards',
    subItems: [
      { label: '報酬管理', href: '/rewards' },
      { label: '報酬グラフ', href: '/rewards/graph' },
    ],
  },
  {
    label: '記事',
    href: null,
    subItems: [{ label: '記事一覧', href: '#', disabled: true }],
  },
  {
    label: '家族',
    href: '/family',
    subItems: [
      { label: 'メンバー一覧', href: '/family' },
      { label: 'メンバー招待', href: '/family/invite', parentOnly: true },
      { label: 'メンバー詳細', href: '/family', disabled: true },
    ].filter((item) => !item.parentOnly || isParent),
  },
];

interface HeaderNavProps {
  userName: string;
  role: 'parent' | 'child';
}

export function HeaderNav({ userName, role }: HeaderNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isParent = role === 'parent';
  const navItems = buildNavItems(isParent);

  const [openNav, setOpenNav] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ナビ全体の外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenNav(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ページ遷移時にサブメニューを閉じる
  useEffect(() => {
    setOpenNav(null);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const handleNavMouseEnter = useCallback((label: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenNav(label);
  }, []);

  const handleNavMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpenNav(null), 150);
  }, []);

  const handleSubMenuMouseEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  function isNavActive(item: NavItem): boolean {
    if (!item.href) return false;
    return pathname.startsWith(item.href);
  }

  return (
    <div className="flex items-center gap-4">
      {/* ナビゲーション（サブメニュー付き） */}
      <nav className="hidden md:flex items-center gap-1" ref={navRef}>
        {navItems.map((item) => (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => handleNavMouseEnter(item.label)}
            onMouseLeave={handleNavMouseLeave}
          >
            {/* ナビボタン */}
            {item.href ? (
              <Link
                href={item.href}
                className={`flex items-center gap-0.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isNavActive(item)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${openNav === item.label ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
            ) : (
              <span
                className="flex items-center gap-0.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed"
                title="本番版でご利用いただけます"
              >
                {item.label}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            )}

            {/* サブメニュー */}
            {openNav === item.label && item.subItems.length > 0 && (
              <div
                className="absolute left-0 top-full pt-1 z-50"
                onMouseEnter={handleSubMenuMouseEnter}
                onMouseLeave={handleNavMouseLeave}
              >
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40">
                  {item.subItems.map((sub) =>
                    sub.disabled ? (
                      <span
                        key={sub.label}
                        className="block px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                        title="本番版でご利用いただけます"
                      >
                        {sub.label}
                      </span>
                    ) : (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          pathname === sub.href
                            ? 'text-blue-600 bg-blue-50 font-medium'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {sub.label}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* ユーザーメニュー */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{userName}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isUserMenuOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
