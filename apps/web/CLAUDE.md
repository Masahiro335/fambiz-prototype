# CLAUDE.md — apps/web（Next.js）固有規約

> Next.js 14 App Router フロントエンドの実装規約。ルートの `CLAUDE.md` と合わせて参照すること。

---

## アーキテクチャ概要

```
apps/web/src/
├── app/
│   ├── (auth)/             # SCR-AUTH: 認証画面群（ログイン・登録）
│   │   ├── login/
│   │   ├── register/
│   │   └── profile/
│   ├── (dashboard)/        # SCR-TOP-001: ダッシュボード（認証済みレイアウト）
│   │   ├── layout.tsx      # 認証チェック + ヘッダー/フッター
│   │   ├── page.tsx        # メニュー画面
│   │   ├── tasks/          # SCR-TASK-001〜003
│   │   ├── goals/          # SCR-GOAL-001〜002
│   │   ├── rewards/        # SCR-REWARD-001〜002
│   │   └── family/         # SCR-GROUP-001〜005
│   ├── layout.tsx          # ルートレイアウト
│   └── page.tsx            # トップページ（未ログイン時）
├── components/
│   ├── ui/                 # 汎用UIコンポーネント（Button, Card等）
│   ├── TaskCard.tsx        # タスクカード
│   ├── GoalProgress.tsx    # 目標進捗バー
│   └── RewardSummary.tsx   # 報酬サマリー
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # ブラウザ用Supabaseクライアント
│   │   └── server.ts       # Server Component用クライアント
│   └── api/
│       └── fetcher.ts      # 型安全なfetchラッパー
└── middleware.ts            # 認証チェック（未ログイン時リダイレクト）
```

---

## Server Components vs Client Components の使い分け

| 処理 | 使用するコンポーネント | 理由 |
|------|---------------------|------|
| データフェッチ（一覧・詳細） | **Server Component（デフォルト）** | ウォーターフォール防止・SEO |
| インタラクション（ボタン押下・フォーム） | `'use client'` を付与 | イベントハンドラが必要 |
| ローディング状態 | `loading.tsx` | App Routerの組み込み機能を使う |
| エラー境界 | `error.tsx` | App Routerの組み込み機能を使う |

```tsx
// ✅ Server Componentでデータフェッチ
// app/(dashboard)/tasks/page.tsx
export default async function TasksPage() {
  const tasks = await fetchTasks(); // サーバーサイドでfetch
  return <TaskList tasks={tasks} />;
}

// ✅ Client Componentでインタラクション
// components/TaskCard.tsx
'use client';
export function TaskCard({ task }: { task: Task }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ...
}
```

---

## 型安全な API フェッチ

NestJS APIへのリクエストは `src/lib/api/fetcher.ts` の共通ラッパーを使う。`packages/types` の型を必ず使う。

```typescript
// src/lib/api/fetcher.ts
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const session = await getServerSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json() as Promise<T>;
}

// 使用例
const tasks = await apiFetch<TaskResponse[]>('/tasks');
```

---

## 認証フロー

```typescript
// middleware.ts — 認証チェックとリダイレクト
export async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// 保護対象: /dashboard/* 配下の全ルート
```

---

## ロールに応じた表示制御

```tsx
// components/RoleGate.tsx
export function RoleGate({
  role,
  children,
}: {
  role: 'parent' | 'child';
  children: React.ReactNode;
}) {
  const { user } = useUser(); // JWTクレームから取得
  if (user?.role !== role) return null;
  return <>{children}</>;
}

// 使用例: 親のみ「承認」ボタンを表示
<RoleGate role="parent">
  <ApproveButton taskId={task.id} />
</RoleGate>
```

---

## Supabase クライアントの使い分け

```typescript
// Server Component / Server Action / Route Handler
import { createServerClient } from '@/lib/supabase/server';
const supabase = createServerClient();

// Client Component（ブラウザ側）
import { createBrowserClient } from '@/lib/supabase/client';
const supabase = createBrowserClient();
```

---

## コンポーネント設計規約

- **`components/ui/`**: shadcn/ui ベースの汎用コンポーネント。ビジネスロジックを含まない。
- **`components/*.tsx`**: ドメイン固有コンポーネント（TaskCard, GoalProgress等）。
- `'use client'` は必要な箇所のみ。親コンポーネントに無闇につけない。
- Propsの型は `packages/types` の共有型を使う。ローカルで型を再定義しない。

---

## よくあるミス

- `'use client'` をページトップレベルに置いてServer Componentの恩恵がなくなる → 最小単位のインタラクティブ部分にのみ付与
- `process.env.NEXT_PUBLIC_API_URL` が未定義のまま `fetch` して `undefined/path` にリクエストが飛ぶ → `.env.local` を必ず設定
- ロール表示制御をフロントのみで行い、バックエンドのGuardを省略する → フロントは表示制御のみ。権限チェックはバックエンドが必須
- `new Date()` のタイムゾーンずれ → 日付表示は `toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })` を使う
