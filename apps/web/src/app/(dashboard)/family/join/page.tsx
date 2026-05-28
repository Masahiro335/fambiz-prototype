import { redirect } from 'next/navigation';
import type { JwtPayload } from '@fambiz/types';
import { createServerClient } from '@/lib/supabase/server';
import { apiFetch, ApiError } from '@/lib/api/fetcher';
import { JoinGroupForm } from './_components/JoinGroupForm';

interface JoinPageProps {
  searchParams: Promise<{ code?: string }>;
}

// グループ参加プレビューAPIのレスポンス型
interface GroupPreviewResponse {
  groupName: string;
  memberCount: number;
}

// 家族グループ参加ページ（Server Component）
// Supabase を直接使わず NestJS API 経由でグループ情報を取得する。
// これは groups テーブルの RLS が未参加ユーザーからの参照を禁止しているため。
export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { code } = await searchParams;

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合はログイン画面へリダイレクトする
  if (!session) {
    redirect('/login');
  }

  // 招待コードが指定されていない場合は家族管理ページへリダイレクトする
  if (!code) {
    redirect('/family');
  }

  // JWTペイロードからfamily_group_idを取得する
  let familyGroupId: string | null = null;

  try {
    const payload = JSON.parse(
      atob(session.access_token.split('.')[1]),
    ) as Partial<JwtPayload>;
    familyGroupId = payload.family_group_id ?? null;
  } catch {
    const metadata = session.user.user_metadata as {
      family_group_id?: string;
    };
    familyGroupId = metadata.family_group_id ?? null;
  }

  // 既にグループに参加済みの場合は家族管理ページへリダイレクトする
  if (familyGroupId) {
    redirect('/family');
  }

  // NestJS API 経由でグループ情報を取得する（RLS バイパスが必要なため）
  let groupPreview: GroupPreviewResponse | null = null;
  try {
    groupPreview = await apiFetch<GroupPreviewResponse>(
      `/v1/groups/join/preview?inviteCode=${encodeURIComponent(code)}`,
    );
  } catch (err) {
    // 招待コードが無効（404）または API エラーの場合
    const isNotFound = err instanceof ApiError && err.status === 404;
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">グループに参加する</h2>
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
          <p className="text-red-600 font-medium mb-2">招待コードが無効です</p>
          <p className="text-sm text-gray-500">
            {isNotFound
              ? 'この招待コードは無効または期限切れです。招待者に再度QRコードを発行してもらってください。'
              : 'グループ情報の取得に失敗しました。時間をおいて再度お試しください。'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">グループに参加する</h2>

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
        <p className="text-sm text-gray-500 mb-4">
          以下のグループへの参加リクエストを確認してください。
        </p>

        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">グループ名</p>
          <p className="text-xl font-bold text-gray-800">{groupPreview.groupName}</p>
        </div>

        <div className="mb-6 bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">現在のメンバー数</p>
          <p className="text-gray-700 font-medium">{groupPreview.memberCount} 人</p>
        </div>

        <JoinGroupForm inviteCode={code} groupName={groupPreview.groupName} />
      </div>
    </div>
  );
}
