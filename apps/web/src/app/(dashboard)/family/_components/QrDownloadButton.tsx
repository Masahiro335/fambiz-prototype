'use client';

interface QrDownloadButtonProps {
  qrDataUrl: string;
  inviteCode: string;
}

// QRコードをPNG画像としてダウンロードするボタン（Client Component）
export function QrDownloadButton({ qrDataUrl, inviteCode }: QrDownloadButtonProps) {
  return (
    <a
      href={qrDataUrl}
      download={`invite-qr-${inviteCode}.png`}
      className="inline-block px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
    >
      ダウンロード
    </a>
  );
}
