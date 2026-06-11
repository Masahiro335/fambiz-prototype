// タスク検索ページのローディングUI（スケルトン）
export default function TaskSearchLoading() {
  return (
    <div>
      {/* ページタイトルのスケルトン */}
      <div className="h-8 bg-gray-200 rounded w-40 mb-6 animate-pulse" />

      {/* 検索フォームカードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 animate-pulse">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-16 mb-1" />
              <div className="h-9 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <div className="h-9 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* 検索結果テーブルのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-pulse">
        {/* テーブルヘッダー */}
        <div className="bg-gray-50 border-b px-4 py-3 grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
        {/* テーブル行のスケルトン */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 border-b grid grid-cols-5 gap-4 items-center">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-100 rounded-full w-12" />
            <div className="h-5 bg-gray-100 rounded-full w-14" />
            <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
            <div className="h-4 bg-gray-100 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
