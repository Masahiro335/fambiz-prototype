import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

// ログインページ
// useSearchParams() を Suspense でラップして Next.js 15 の要件に準拠する
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
