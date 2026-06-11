// 招待ページのローディングUI（スケルトン）
export default function InviteLoading() {
  return (
    <div>
      {/* ページタイトルのスケルトン */}
      <div className="h-8 bg-gray-200 rounded w-36 mb-6 animate-pulse" />

      {/* カードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-sm animate-pulse">
        <div className="flex flex-col items-center gap-4">
          {/* QRコードのスケルトン */}
          <div className="w-64 h-64 bg-gray-200 rounded-lg" />

          {/* 招待コードのスケルトン */}
          <div className="w-full bg-gray-100 rounded-lg px-4 py-3">
            <div className="h-3 bg-gray-200 rounded w-20 mx-auto mb-2" />
            <div className="h-4 bg-gray-200 rounded w-40 mx-auto" />
          </div>

          {/* ダウンロードボタンのスケルトン */}
          <div className="h-9 bg-gray-200 rounded w-32" />
        </div>
      </div>
    </div>
  );
}
