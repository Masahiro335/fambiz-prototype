export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-24 mb-6" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-5 shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-12 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 bg-gray-100 rounded-lg" />
              <div className="h-11 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
