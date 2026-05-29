// メンバー脱退ページのローディングUI（スケルトン）
export default function LeaveLoading() {
  return (
    <div>
      {/* ページタイトルのスケルトン */}
      <div className="h-8 bg-gray-200 rounded w-36 mb-6 animate-pulse" />

      {/* カードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md animate-pulse">
        {/* メンバー一覧のスケルトン */}
        <div className="space-y-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* ボタンのスケルトン */}
        <div className="h-12 bg-gray-200 rounded w-full" />
      </div>
    </div>
  );
}
