# /security-audit

**引数**: `$ARGUMENTS`（任意。ドメイン指定、例: `tasks`、`rewards`。省略時は全体監査）

FamBizの3つのセキュリティ要件（認証認可・データ分離・計算精度）をサブエージェントで**並列監査**します。

---

## 実行手順

`apps/api/src/` と `infra/supabase/` を対象に、**Agent ツールで以下3つのサブエージェントを同時に起動**する。

---

### サブエージェント 1: 認証・認可チェック

プロンプト例:
```
FamBiz の apps/api/src/modules/ 配下の全 Controller ファイルを走査して、
認証・認可の実装漏れを検出してください。

チェック項目:
1. @UseGuards(JwtAuthGuard, RolesGuard) が全 @Controller クラスに付与されているか
2. 以下の操作を行うエンドポイントに @Roles('parent') が付与されているか:
   - タスク登録（POST /tasks）
   - タスク承認（PATCH /tasks/:id/approve）
   - 報酬確定（POST /rewards）
   - 目標登録・更新（POST/PATCH /goals）
3. 公開エンドポイント（/auth/register, /auth/login）以外に security: [] 相当の設定がないか

結果: 問題なし / 要修正箇所のファイルパス・行番号・内容を一覧化
```

---

### サブエージェント 2: family_group_id 分離チェック

プロンプト例:
```
FamBiz の apps/api/src/modules/ 配下の全 Repository ファイルと、
infra/supabase/migrations/ の RLS ポリシーを走査して、
family_group_id によるデータ分離の実装漏れを検出してください。

チェック項目（Repository）:
1. .from('<table>').select() に .eq('family_group_id', ...) が含まれているか
2. .update() / .delete() にも family_group_id フィルタがあるか
3. サービス層で user.family_group_id を取得して Repository に渡しているか

チェック項目（RLS）:
1. 各テーブルに SELECT / INSERT / UPDATE / DELETE の RLS ポリシーが定義されているか
2. ポリシーが family_group_id の一致を条件にしているか

結果: 問題なし / 要修正箇所のファイルパス・行番号・内容を一覧化
```

---

### サブエージェント 3: 計算・タイムゾーンチェック

プロンプト例:
```
FamBiz の apps/api/src/ と apps/web/src/ 配下のコードを走査して、
計算精度とタイムゾーンの実装ミスを検出してください。

チェック項目（計算）:
1. Math.round() または Math.ceil() の使用箇所を検出する（→ Math.floor() に要修正）
2. 報酬・ボーナス計算の関数で Math.floor() が使われているか確認する

チェック項目（タイムゾーン）:
1. new Date() を日付計算・集計に直接使用している箇所を検出する
2. API側: date-fns-tz の zonedTimeToUtc / utcToZonedTime を使わずに日付集計している箇所
3. Web側: toLocaleDateString() に timeZone: 'Asia/Tokyo' が指定されていない箇所

結果: 問題なし / 要修正箇所のファイルパス・行番号・内容を一覧化
```

---

## 結果まとめ

3つのサブエージェントの結果を統合し、以下の形式で報告する：

```
## セキュリティ監査結果

| 項目                     | 状態       | 要修正数 |
|--------------------------|-----------|---------|
| 認証・認可                | ✅ / ⚠️  |    0    |
| family_group_id 分離      | ✅ / ⚠️  |    0    |
| 計算・タイムゾーン         | ✅ / ⚠️  |    0    |

### ⚠️ 要修正事項
（あれば箇条書き）
```
