// メンバー詳細ページのローディングUI（スケルトン）
export default function MemberDetailLoading() {
  return (
    <div>
      {/* ページタイトルのスケルトン */}
      <div className="h-8 bg-gray-200 rounded w-36 mb-6 animate-pulse" />

      {/* カードのスケルトン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md animate-pulse">
        {/* アバターのスケルトン */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gray-200" />
        </div>

        {/* 名前のスケルトン */}
        <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2" />

        {/* コメントのスケルトン */}
        <div className="h-4 bg-gray-100 rounded w-48 mx-auto mb-4" />

        {/* テーブルのスケルトン */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="h-10 bg-gray-100 border-b" />
          <div className="h-12 bg-gray-50" />
        </div>

        {/* 閉じるボタンのスケルトン */}
        <div className="flex justify-center">
          <div className="h-9 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  );
}
