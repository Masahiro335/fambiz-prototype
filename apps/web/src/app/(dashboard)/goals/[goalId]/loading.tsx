// 目標詳細ページのローディング状態（スケルトンUI）
export default function GoalDetailLoading() {
  return (
    <div className="max-w-2xl animate-pulse">
      {/* ページヘッダーのスケルトン */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
        <div className="h-9 w-20 bg-gray-200 rounded-lg" />
      </div>

      {/* 目標詳細カードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        {/* 目標名とステータスバッジのスケルトン */}
        <div className="flex items-start justify-between gap-4">
          <div className="h-7 w-56 bg-gray-200 rounded-lg" />
          <div className="h-7 w-16 bg-gray-200 rounded-full" />
        </div>

        {/* 進捗バーのスケルトン */}
        <div>
          <div className="flex justify-between mb-1">
            <div className="h-3 w-8 bg-gray-200 rounded" />
            <div className="h-3 w-8 bg-gray-200 rounded" />
          </div>
          <div className="h-2 bg-gray-200 rounded-full w-full" />
        </div>

        {/* 詳細情報リストのスケルトン */}
        <div className="divide-y divide-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* ボタンエリアのスケルトン */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <div className="h-10 bg-gray-200 rounded-lg flex-1" />
          <div className="h-10 bg-gray-200 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}
