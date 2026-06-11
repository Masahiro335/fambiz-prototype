// 目標一覧ページのローディングUI（スケルトン）
export default function GoalsLoading() {
  return (
    <div>
      {/* ページタイトルとボタン領域のスケルトン */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
        <div className="h-9 bg-gray-200 rounded w-32 animate-pulse" />
      </div>

      {/* 対象月表示のスケルトン */}
      <div className="h-4 bg-gray-200 rounded w-24 mb-4 animate-pulse" />

      {/* 目標カードのスケルトン */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border p-4 animate-pulse"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-16 shrink-0" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
            <div className="h-2 bg-gray-200 rounded-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
