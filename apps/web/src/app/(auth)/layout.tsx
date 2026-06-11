// 認証ページ共通レイアウト（ログイン・登録・プロフィール）
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* ロゴ・アプリ名 */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-600">FamBiz</h1>
        <p className="text-sm text-gray-500 mt-1">家族のお手伝い管理・お小遣い管理</p>
      </div>
      {/* フォームカード */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">{children}</div>
    </div>
  );
}
