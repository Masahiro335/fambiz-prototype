# FamBiz 画面遷移図

- システム名：FamBiz
- 対象バージョン：プロトタイプ版（MVP）
- 最終更新日：2026-05-22
- 記法：Mermaid flowchart

> 凡例
> - 青枠：プロトタイプ対象画面
> - 赤枠（本番のみ）：本番版のみ対象
> - 破線矢印：条件分岐による遷移

---

## 1. 新規登録フロー

```mermaid
flowchart LR
    A([登録画面\nSCR-AUTH-001]) --> B([ログイン画面\nSCR-AUTH-002])
    B --> C([プロフィール登録画面\nSCR-AUTH-004])
    C --> D([メニュー画面\nSCR-TOP-001])
    B -.->|パスワードを忘れた| E([パスワードリセット画面\n本番のみ])
    E --> B
```

---

## 2. TOPページ（メニュー画面）からの遷移

```mermaid
flowchart TD
    TOP([メニュー画面\nSCR-TOP-001])

    TOP --> T1([タスク一覧\nSCR-TASK-001])
    TOP --> T2([タスク新規登録\nSCR-TASK-003])
    TOP --> G1([目標一覧\nSCR-GOAL-001])
    TOP --> G2([目標新規登録\nSCR-GOAL-003])
    TOP --> R1([報酬管理\nSCR-REWARD-001])
    TOP --> R2([報酬グラフ\nSCR-REWARD-002])
    TOP --> A1([記事一覧\n本番のみ])
    TOP --> F1([家族メンバー一覧\nSCR-GROUP-001])
    TOP --> F3([家族グループ招待\nSCR-GROUP-003])
```

---

## 3. タスク管理フロー

```mermaid
flowchart TD
    TL([タスク一覧\nSCR-TASK-001])
    TL --> TD_C([タスク詳細・子ビュー\nSCR-TASK-002])
    TL --> TD_P([タスク詳細・親ビュー\nSCR-TASK-002b])
    TL --> TS([タスク検索\nSCR-TASK-005])

    TD_P --> TE([タスク編集\nSCR-TASK-004])
    TE --> TL

    TR([タスク新規登録\nSCR-TASK-003]) --> TL

    TD_C -->|対応済ボタン| TL
    TD_P -->|削除| TL
    TS --> TD_C
    TS --> TD_P
```

---

## 4. 目標管理フロー

```mermaid
flowchart TD
    GL([目標一覧\nSCR-GOAL-001])
    GL --> GD([目標詳細\nSCR-GOAL-002])
    GL --> GR([目標新規登録\nSCR-GOAL-003])
    GL --> TS([タスク検索\nSCR-TASK-005])

    GD -->|未挑戦→挑戦中\n子が操作| GD
    GD -->|挑戦中→達成済/未達成\n親が操作| GD
    GD -->|達成済→承認\n親が操作| GD

    GD --> GE([目標編集\nSCR-GOAL-004])
    GE --> GL
```

---

## 5. 報酬管理フロー

```mermaid
flowchart LR
    R1([報酬管理\nSCR-REWARD-001]) <-->|月切り替え| R1
    R1 --> R2([報酬グラフ\nSCR-REWARD-002])
    R2 <-->|年度切り替え| R2
```

---

## 6. 家族グループ管理フロー

```mermaid
flowchart TD
    FL([家族メンバー一覧\nSCR-GROUP-001])
    FL --> FD([家族メンバー詳細\nSCR-GROUP-002])
    FL --> FI([家族グループ招待\nSCR-GROUP-003])
    FL --> FW([家族グループ脱退\nSCR-GROUP-005])

    FD --> FL
    FW -->|脱退完了| FL

    FI -->|QRコード共有| FJ([家族グループ参加\nSCR-GROUP-004])
    FJ -->|未ログイン| LG([ログイン画面\nSCR-AUTH-002])
    LG --> FJ
    FJ -->|参加完了| TOP([メニュー画面\nSCR-TOP-001])
    FJ -->|キャンセル| TOP
```

---

## 7. ヘッダーからの遷移

```mermaid
flowchart LR
    H([ヘッダー\nSCR-HEADER-001])
    H -->|アイコンメニュー → 各種設定| S([各種設定\nSCR-SETTING-001])
    H -->|アイコンメニュー → ログアウト| LG([ログイン画面\nSCR-AUTH-002])
    H -->|ベルアイコン| N([お知らせ一覧\n本番のみ])
    H -->|報酬メニュー → 月次報酬分析| R1([報酬管理\nSCR-REWARD-001])
    H -->|報酬メニュー → 年次報酬分析| R2([報酬グラフ\nSCR-REWARD-002])

    S --> SP([プロフィール登録\nSCR-AUTH-004])
    S --> PW([パスワード変更\nSCR-AUTH-003])
```

---

## 8. フッターからの遷移

```mermaid
flowchart LR
    F([フッター\nSCR-FOOTER-001])
    F --> TOS([利用規約\n本番のみ])
    F --> PP([プライバシーポリシー\n本番のみ])
    F --> CON([お問い合わせ\n本番のみ])
```

---

## 9. 全体遷移サマリー

```mermaid
flowchart TD
    subgraph AUTH[認証]
        A001([新規登録\nSCR-AUTH-001])
        A002([ログイン\nSCR-AUTH-002])
        A003([PW変更\nSCR-AUTH-003])
        A004([プロフィール登録\nSCR-AUTH-004])
    end

    subgraph MAIN[メイン]
        TOP([メニュー\nSCR-TOP-001])
    end

    subgraph TASK[タスク管理]
        T001([一覧\nSCR-TASK-001])
        T002([詳細\nSCR-TASK-002])
        T003([新規登録\nSCR-TASK-003])
        T004([編集\nSCR-TASK-004])
        T005([検索\nSCR-TASK-005])
    end

    subgraph GOAL[目標管理]
        G001([一覧\nSCR-GOAL-001])
        G002([詳細\nSCR-GOAL-002])
        G003([新規登録\nSCR-GOAL-003])
        G004([編集\nSCR-GOAL-004])
    end

    subgraph REWARD[報酬管理]
        R001([報酬管理\nSCR-REWARD-001])
        R002([報酬グラフ\nSCR-REWARD-002])
    end

    subgraph GROUP[家族グループ]
        GR001([一覧\nSCR-GROUP-001])
        GR002([詳細\nSCR-GROUP-002])
        GR003([招待\nSCR-GROUP-003])
        GR004([参加\nSCR-GROUP-004])
        GR005([脱退\nSCR-GROUP-005])
    end

    subgraph SETTING[設定]
        S001([各種設定\nSCR-SETTING-001])
    end

    A001 --> A002 --> A004 --> TOP
    TOP --> T001 & T003 & G001 & G003 & R001 & R002 & GR001 & GR003
    T001 --> T002 & T005
    T002 --> T004
    G001 --> G002 & G003
    G002 --> G004
    GR001 --> GR002 & GR003 & GR005
    GR005 --> GR001
    GR003 -.-> GR004
    S001 --> A004 & A003
```
