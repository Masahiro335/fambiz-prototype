// 報酬管理ページのローディングUI（スケルトン）
export default function RewardsLoading() {
  return (
    <div>
      {/* ページタイトルのスケルトン */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
      </div>

      {/* 月ナビゲーターのスケルトン */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* サマリーカードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 rounded w-40" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-3 bg-gray-100 rounded w-16 mx-auto mb-2" />
              <div className="h-8 bg-gray-200 rounded w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* テーブルのスケルトン */}
      <div className="h-5 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-pulse">
        <div className="p-4 border-b bg-gray-50">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 border-b">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
