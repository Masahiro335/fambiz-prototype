import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PROTECTED_PATHS = ['/family', '/tasks', '/goals', '/rewards'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  // Supabase 環境変数が未設定の場合はミドルウェアをスキップ（保護ルートはページ側でリダイレクト）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && isProtectedRoute(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      const next = request.nextUrl.pathname + request.nextUrl.search;
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(url);
    }
  } catch {
    // Supabase 接続エラー時は保護ルートをログインへリダイレクト
    if (isProtectedRoute(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  // _next内部リクエスト・静的ファイル・APIルートは除外してgetSession()呼び出しを最小化する
  matcher: ['/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'],
};
