import { Suspense } from 'react';
import { RegisterForm } from './RegisterForm';

// 新規登録ページ
// useSearchParams() を Suspense でラップして Next.js 15 の要件に準拠する
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
