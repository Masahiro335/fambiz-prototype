import { redirect } from 'next/navigation';
import qrcode from 'qrcode';
import type { JwtPayload } from '@fambiz/types';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api/fetcher';
import { QrDownloadButton } from '../_components/QrDownloadButton';

// APIレスポンス型（@fambiz/typesに定義がないためインライン定義）
interface InviteResponse {
  inviteCode: string;
  expiresAt: string | null;
}

// メンバー招待ページ（Server Component）
// 親ロールのみアクセス可能
export default async function InvitePage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合はダッシュボードlayout.tsxでリダイレクト済み
  if (!session) {
    return null;
  }

  // JWTペイロードからロールとfamily_group_idを取得する
  let role: string | null = null;
  let familyGroupId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    role = payload.role ?? null;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    // JWTのパースに失敗した場合はuser_metadataからフォールバックする
    const metadata = session.user.user_metadata as {
      role?: string;
      family_group_id?: string;
    };
    role = metadata.role ?? null;
    familyGroupId = metadata.family_group_id ?? null;
  }

  // 親ロール以外はメンバー一覧へリダイレクトする
  if (role !== 'parent') {
    redirect('/family');
  }

  // グループ未参加の場合はメンバー一覧へリダイレクトする
  if (!familyGroupId) {
    redirect('/family');
  }

  // 招待コードをAPIから取得する
  const { inviteCode, expiresAt } = await apiFetch<InviteResponse>(
    `/v1/groups/${familyGroupId}/invite`,
    { method: 'POST' },
  );

  // 招待URLを組み立てる（NEXT_PUBLIC_WEB_URLが未設定の場合はlocalhostをデフォルトとする）
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
  const joinUrl = `${baseUrl}/family/join?code=${inviteCode}`;

  // QRコードのData URLをサーバーサイドで生成する
  const qrDataUrl = await qrcode.toDataURL(joinUrl, {
    width: 256,
    margin: 2,
  });

  // 有効期限を日本語形式にフォーマットする
  const expiresAtFormatted = expiresAt
    ? new Date(expiresAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">メンバー招待</h2>

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-sm">
        <div className="flex flex-col items-center gap-4">
          {/* QRコード画像 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="招待用QRコード"
            width={256}
            height={256}
            className="rounded-lg border"
          />

          {/* 招待コード表示 */}
          <div className="w-full bg-gray-50 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-gray-500 mb-1">招待コード</p>
            <p className="font-mono text-sm font-medium text-gray-800 break-all">
              {inviteCode}
            </p>
          </div>

          {/* 有効期限（存在する場合のみ表示） */}
          {expiresAtFormatted && (
            <p className="text-xs text-gray-400">
              有効期限: {expiresAtFormatted} まで
            </p>
          )}

          {/* ダウンロードボタン（ブラウザ側処理のためClient Component） */}
          <QrDownloadButton qrDataUrl={qrDataUrl} inviteCode={inviteCode} />
        </div>
      </div>
    </div>
  );
}
