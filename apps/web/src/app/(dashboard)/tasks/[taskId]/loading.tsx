// タスク詳細ページのローディング状態（スケルトンUI）
export default function TaskDetailLoading() {
  return (
    <div className="max-w-2xl animate-pulse">
      {/* ページヘッダーのスケルトン */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
        <div className="h-9 w-20 bg-gray-200 rounded-lg" />
      </div>

      {/* タスク詳細カードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        {/* タスク名とステータスバッジのスケルトン */}
        <div className="flex items-start justify-between gap-4">
          <div className="h-7 w-48 bg-gray-200 rounded-lg" />
          <div className="h-7 w-16 bg-gray-200 rounded-full" />
        </div>

        {/* 詳細情報リストのスケルトン */}
        <div className="divide-y divide-gray-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
