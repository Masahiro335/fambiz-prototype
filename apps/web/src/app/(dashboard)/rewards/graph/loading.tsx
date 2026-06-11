// 報酬グラフページのローディング状態
export default function Loading() {
  return (
    <div>
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="flex gap-4 mb-6">
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="h-72 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
