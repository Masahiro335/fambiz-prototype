import { Suspense } from 'react';
import { ProfileForm } from './ProfileForm';

// プロフィール登録ページ
// useSearchParams() を Suspense でラップして Next.js 15 の要件に準拠する
export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileForm />
    </Suspense>
  );
}
