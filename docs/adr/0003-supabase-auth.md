# ADR-0003: Supabase Auth 採用と JWT カスタムクレーム方針

| 項目 | 値 |
|------|-----|
| ステータス | 承認済み |
| 決定日 | 2025-12-01 |
| 決定者 | 開発者 |

---

## コンテキスト

FamBizには以下の認証・認可要件がある。

- 親と子でアカウントを分け、ロール（`parent` / `child`）に応じて操作権限を制御する
- ユーザーは必ず家族グループに属し、自分のグループのデータのみアクセスできる
- プロトタイプはID/パスワード認証、本番はGoogle OAuth（SSO）を追加予定
- 認証基盤をスクラッチで構築するコストを避けたい（個人開発のため）

認証基盤を自前実装した場合、JWT署名・リフレッシュトークン管理・セキュリティパッチ適用等に多大なコストがかかる。

---

## 決定

**認証基盤として Supabase Auth を採用し、ロール（親/子）と家族グループIDをJWTカスタムクレームに含める方針を採用する。**

Y-Statement形式:

> 個人開発での認証実装コスト最小化と、将来のOAuth拡張を見据えたコンテキストにおいて、マネージドな認証基盤とDB（PostgreSQL）のセット運用によるインフラ簡素化のために、Supabase Authを採用することを決定した。Auth0やFirebase Authという代替案に比べ、PostgreSQLとの統合深度が高くRLSポリシーをSupabase内で完結させられる利点がある一方、Supabaseベンダー依存というトレードオフを受け入れる。

---

## 採用理由

1. **PostgreSQLとのネイティブ統合**: Supabase AuthはPostgreSQLの `auth.users` テーブルとネイティブに統合される。RLS（Row Level Security）ポリシーで `auth.uid()` や `auth.jwt()` を直接参照でき、DB層でのマルチテナント分離が実現できる。

2. **費用**: 無料枠（月5万MAU）でプロトタイプ運用が可能。追加インフラコストなし。

3. **OAuthの追加容易性**: プロトタイプはEmail/Password、本番でGoogle OAuthを追加する際はSupabaseダッシュボードで有効化するだけで対応できる。コードの変更が最小限。

4. **SDKの充実**: `@supabase/supabase-js` がNext.js・NestJSで利用可能。App Router向けの `@supabase/ssr` パッケージでSSR時のセッション管理も標準対応。

---

## JWT カスタムクレームの設計方針

Supabase AuthのJWTには標準クレーム（`sub`, `email`, `exp`等）に加え、PostgreSQL Functions（Database Hooks）を使いカスタムクレームを追加する。

### 追加するカスタムクレーム

```json
{
  "sub": "user-uuid",
  "role": "parent",
  "family_group_id": "group-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

| クレーム | 型 | 説明 |
|---------|-----|------|
| `role` | `"parent"` \| `"child"` | ユーザーの役割。NestJSのGuardでロールベースの権限チェックに使用 |
| `family_group_id` | `string (UUID)` | 所属家族グループのID。DBのRLSポリシーでデータ分離に使用 |

### NestJS側での検証方法

```typescript
// apps/api/src/shared/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request);
    const payload = verifySupabaseJwt(token, process.env.SUPABASE_JWT_SECRET);
    request.user = payload; // { sub, role, family_group_id }
    return true;
  }
}
```

### RLSポリシーの例

```sql
-- tasksテーブルは同じfamily_group_idのユーザーのみアクセス可能
CREATE POLICY "family_isolation" ON tasks
  USING (family_group_id = (auth.jwt() ->> 'family_group_id')::uuid);
```

---

## 代替案の検討

| 案 | 内容 | 却下理由 |
|----|------|---------|
| Auth0 | マネージドAuth基盤 | 無料枠制限が厳しく有料化コストが高い。DB統合が深くない |
| Firebase Auth | GoogleマネージドAuth | PostgreSQLではなくFirestoreとの相性前提。RDB運用と二重管理になる |
| NextAuth.js | Next.js向けAuth | NestJS（別プロセス）との統合が複雑。バックエンドAPIの保護が難しい |
| 自前JWT実装 | 独自の認証ロジック | リフレッシュトークン管理・セキュリティパッチ等のメンテコストが高すぎる |

---

## 影響範囲

- `apps/web/src/lib/supabase.ts`: ブラウザ・サーバーそれぞれのSupabaseクライアントを設定
- `apps/api/src/modules/auth/`: JWTカスタムクレームの検証ロジック
- `apps/api/src/shared/guards/`: `JwtAuthGuard`・`RolesGuard` の実装
- `infra/supabase/`: RLSポリシーのマイグレーション管理
- 環境変数: `SUPABASE_URL`・`SUPABASE_ANON_KEY`・`SUPABASE_JWT_SECRET` を各アプリで管理
