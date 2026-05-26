import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">メニュー</h2>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/tasks" className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border">
          <h3 className="font-semibold text-lg mb-1">タスク管理</h3>
          <p className="text-sm text-gray-500">お手伝いタスクの確認・報告</p>
        </Link>
        <Link href="/goals" className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border">
          <h3 className="font-semibold text-lg mb-1">目標管理</h3>
          <p className="text-sm text-gray-500">今月の目標を確認する</p>
        </Link>
        <Link href="/rewards" className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border">
          <h3 className="font-semibold text-lg mb-1">お小遣い確認</h3>
          <p className="text-sm text-gray-500">今月の獲得金額を確認</p>
        </Link>
        <Link href="/family" className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border">
          <h3 className="font-semibold text-lg mb-1">家族管理</h3>
          <p className="text-sm text-gray-500">家族グループの設定</p>
        </Link>
      </div>
    </div>
  );
}
