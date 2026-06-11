// 家族管理ページのローディングUI（スケルトン）
export default function FamilyLoading() {
  return (
    <div>
      {/* ページタイトルのスケルトン */}
      <div className="h-8 bg-gray-200 rounded w-32 mb-6 animate-pulse" />

      {/* カードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-full mb-6" />
        <div className="space-y-4">
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
            <div className="h-10 bg-gray-100 rounded w-full" />
          </div>
          <div className="h-12 bg-gray-200 rounded w-full" />
        </div>
      </div>
    </div>
  );
}
