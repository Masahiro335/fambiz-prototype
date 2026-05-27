import { createServerClient } from '@/lib/supabase/server';
import type { JwtPayload } from '@fambiz/types';
import { CreateGroupForm } from './_components/CreateGroupForm';

// 家族グループ管理ページ（Server Component）
export default async function FamilyPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // セッションがない場合は空を返す（ダッシュボードlayout.tsxでリダイレクト済み）
  if (!session) {
    return null;
  }

  // JWTペイロードからユーザーのロールとfamily_group_idを取得する
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">家族管理</h2>

      {familyGroupId ? (
        // グループ参加済みの場合のメッセージ（後続タスクで詳細実装）
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
          <p className="text-gray-700 font-medium">グループに参加済みです。</p>
          <p className="text-sm text-gray-500 mt-1">
            グループ詳細の機能は今後追加予定です。
          </p>
        </div>
      ) : role === 'parent' ? (
        // グループ未所属の親ユーザーにグループ作成フォームを表示する
        <CreateGroupForm />
      ) : (
        // グループ未所属の子ユーザーへのメッセージ
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
          <p className="text-gray-700 font-medium">まだグループに参加していません。</p>
          <p className="text-sm text-gray-500 mt-1">
            親に招待してもらいましょう。
          </p>
        </div>
      )}
    </div>
  );
}
