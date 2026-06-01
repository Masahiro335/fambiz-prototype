/**
 * タスク・目標データをリセットして整合性あるシードデータを投入するスクリプト。
 * 実行: node infra/supabase/seed/reset-and-seed.mjs
 *
 * 削除対象: rewards / goals / task_completions / tasks
 * 保持対象: auth.users / public.users / groups / group_members
 *
 * データ構成（基準日: 2026-06-01 JST）:
 *   2026-05（先月）: タスク5件完了 + 目標達成 → task=600円 + bonus=300円 = 900円（支払済）
 *   2026-06（今月）: タスク5件（completed/reported/pending/cancelled）+ 目標3件 → 100円（集計中）
 *   2026-01〜04:    過去報酬レコード（グラフ表示用）
 */

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const SUPABASE_URL = 'https://hjkcknqbnqpynrmvrduk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa2NrbnFibnFweW5ybXZyZHVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcxODE0MCwiZXhwIjoyMDk1Mjk0MTQwfQ.s74oDhEjrolAzMMp-y1CKd3iiMCpqVQ2XzkCFK4VTLM';

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: WebSocket },
});

const PARENT_ID = '00000000-0000-0000-0000-000000000001';
const CHILD_ID  = '00000000-0000-0000-0000-000000000002';
const GROUP_ID  = '00000000-0000-0000-0000-000000000010';

// ============================================================
// ユーティリティ
// ============================================================

async function run(label, fn) {
  process.stdout.write(`${label}... `);
  try {
    await fn();
    console.log('✓');
  } catch (err) {
    console.log('✗');
    console.error(err);
    process.exit(1);
  }
}

async function deleteAll(table) {
  // deleted_flag の有無にかかわらず全件削除する（neq で全行にマッチ）
  const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`DELETE ${table}: ${error.message}`);
}

async function insert(table, rows) {
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`INSERT ${table}: ${error.message}`);
}

// ============================================================
// 1. 既存データ削除（FK制約に従い逆順）
// ============================================================

await run('rewards を削除',          () => deleteAll('rewards'));
await run('goals を削除',            () => deleteAll('goals'));
await run('task_completions を削除', () => deleteAll('task_completions'));
await run('tasks を削除',            () => deleteAll('tasks'));

// ============================================================
// 2. タスク（先月 2026-05・全て完了済み）
//
// JST 2026-05 範囲 → UTC: >= 2026-04-30T15:00:00Z かつ < 2026-05-31T15:00:00Z
// approved_at がこの範囲内なら rewards.task_reward_total に加算される
// ============================================================

await run('タスク（2026-05）を挿入', () => insert('tasks', [
  {
    id: '00000000-0000-0000-0000-000000000035',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: 'ゴミ出し', category: '掃除', reward_amount: 50,
    status: 'completed', due_date: '2026-05-10T15:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000036',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '皿洗い', category: '料理', reward_amount: 80,
    status: 'completed', due_date: '2026-05-15T15:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000037',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '部屋の掃除', category: '掃除', reward_amount: 200,
    status: 'completed', due_date: '2026-05-20T15:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000038',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '洗濯物を畳む', category: '洗濯', reward_amount: 150,
    status: 'completed', due_date: '2026-05-25T15:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000039',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '風呂掃除', category: '掃除', reward_amount: 120,
    status: 'completed', due_date: '2026-05-28T15:00:00Z',
  },
]));

// ============================================================
// 3. タスク（今月 2026-06・全ステータスを網羅）
// ============================================================

await run('タスク（2026-06）を挿入', () => insert('tasks', [
  {
    // completed: 今月初日に承認済み
    id: '00000000-0000-0000-0000-000000000030',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: 'ゴミ出し', category: '掃除', reward_amount: 100,
    status: 'completed', due_date: '2026-06-01T15:00:00Z',
    memo: '燃えるゴミの日に忘れずに',
  },
  {
    // reported: 子が報告済み・親の承認待ち
    id: '00000000-0000-0000-0000-000000000031',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '洗濯物を畳む', category: '洗濯', reward_amount: 150,
    status: 'reported', due_date: '2026-06-05T15:00:00Z',
  },
  {
    // pending: 未対応（期限 6/10）
    id: '00000000-0000-0000-0000-000000000032',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '部屋の掃除', category: '掃除', reward_amount: 200,
    status: 'pending', due_date: '2026-06-10T15:00:00Z',
    memo: '週に1回はやること',
  },
  {
    // pending: 未対応（期限 6/20）
    id: '00000000-0000-0000-0000-000000000033',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '皿洗い', category: '料理', reward_amount: 80,
    status: 'pending', due_date: '2026-06-20T15:00:00Z',
  },
  {
    // cancelled: 子が取り下げ済み
    id: '00000000-0000-0000-0000-000000000034',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_name: '庭の草むしり', category: '庭仕事', reward_amount: 300,
    status: 'cancelled', due_date: null,
    memo: '梅雨明け後に再設定予定',
  },
]));

// ============================================================
// 4. task_completions
//
// confirmed_reward 合計:
//   2026-05: 50+80+200+150+120 = 600  → rewards.task_reward_total と一致
//   2026-06: 100（ゴミ出し承認済み）   → rewards.task_reward_total と一致
// ============================================================

await run('task_completions（2026-05）を挿入', () => insert('task_completions', [
  {
    id: '00000000-0000-0000-0000-000000000043',
    task_id: '00000000-0000-0000-0000-000000000035',
    child_id: CHILD_ID,
    reported_at: '2026-05-10T01:00:00Z',  // 2026-05-10 10:00 JST
    approved_by: PARENT_ID,
    approved_at: '2026-05-10T03:00:00Z',  // 2026-05-10 12:00 JST ← JST 2026-05 範囲内
    confirmed_reward: 50,
  },
  {
    id: '00000000-0000-0000-0000-000000000044',
    task_id: '00000000-0000-0000-0000-000000000036',
    child_id: CHILD_ID,
    reported_at: '2026-05-15T09:00:00Z',  // 2026-05-15 18:00 JST
    approved_by: PARENT_ID,
    approved_at: '2026-05-15T11:00:00Z',  // 2026-05-15 20:00 JST ← JST 2026-05 範囲内
    confirmed_reward: 80,
  },
  {
    id: '00000000-0000-0000-0000-000000000045',
    task_id: '00000000-0000-0000-0000-000000000037',
    child_id: CHILD_ID,
    reported_at: '2026-05-20T05:00:00Z',  // 2026-05-20 14:00 JST
    approved_by: PARENT_ID,
    approved_at: '2026-05-20T07:00:00Z',  // 2026-05-20 16:00 JST ← JST 2026-05 範囲内
    confirmed_reward: 200,
  },
  {
    id: '00000000-0000-0000-0000-000000000046',
    task_id: '00000000-0000-0000-0000-000000000038',
    child_id: CHILD_ID,
    reported_at: '2026-05-25T00:00:00Z',  // 2026-05-25 09:00 JST
    approved_by: PARENT_ID,
    approved_at: '2026-05-25T02:00:00Z',  // 2026-05-25 11:00 JST ← JST 2026-05 範囲内
    confirmed_reward: 150,
  },
  {
    id: '00000000-0000-0000-0000-000000000047',
    task_id: '00000000-0000-0000-0000-000000000039',
    child_id: CHILD_ID,
    reported_at: '2026-05-28T10:00:00Z',  // 2026-05-28 19:00 JST
    approved_by: PARENT_ID,
    approved_at: '2026-05-28T12:00:00Z',  // 2026-05-28 21:00 JST ← JST 2026-05 範囲内
    confirmed_reward: 120,
  },
]));

await run('task_completions（2026-06）を挿入', () => insert('task_completions', [
  {
    // ゴミ出し: 承認済み（JST 2026-06-01 09:00 = UTC 2026-06-01 00:00）
    id: '00000000-0000-0000-0000-000000000040',
    task_id: '00000000-0000-0000-0000-000000000030',
    child_id: CHILD_ID,
    reported_at: '2026-05-31T23:00:00Z',  // 2026-06-01 08:00 JST（子が朝に報告）
    approved_by: PARENT_ID,
    approved_at: '2026-06-01T00:00:00Z',  // 2026-06-01 09:00 JST ← JST 2026-06 範囲内
    confirmed_reward: 100,
  },
  {
    // 洗濯物を畳む: 報告済み・承認待ち（approved_at は NULL, confirmed_reward は未確定なので 0）
    id: '00000000-0000-0000-0000-000000000041',
    task_id: '00000000-0000-0000-0000-000000000031',
    child_id: CHILD_ID,
    reported_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    confirmed_reward: 0,
  },
]));

// ============================================================
// 5. 目標（goals）
// ============================================================

await run('goals を挿入', () => insert('goals', [
  {
    // 先月（2026-05）: 達成済み → bonus_reward_total に 300 円加算
    id: '00000000-0000-0000-0000-000000000050',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    goal_name: '毎日ゴミ出しをする',
    goal_reward: 300, target_count: 15,
    and_condition_flag: false,
    status: 'achieved', target_month: '2026-05',
  },
  {
    // 今月（2026-06）: 未挑戦（定性目標・action あり）
    id: '00000000-0000-0000-0000-000000000051',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    goal_name: '自分から進んで挨拶をする',
    goal_reward: 500,
    action: '毎日自分から挨拶する',
    and_condition_flag: false,
    status: 'not_started', target_month: '2026-06',
  },
  {
    // 今月（2026-06）: 挑戦中（定量目標・ゴミ出しタスクに紐付け）
    id: '00000000-0000-0000-0000-000000000052',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_id: '00000000-0000-0000-0000-000000000030',
    goal_name: 'ゴミ出しを月15回する',
    goal_reward: 300, target_count: 15,
    and_condition_flag: false,
    status: 'in_progress', target_month: '2026-06',
  },
  {
    // 今月（2026-06）: 承認待ち（定量目標・皿洗いタスクに紐付け）
    id: '00000000-0000-0000-0000-000000000053',
    group_id: GROUP_ID, creator_id: PARENT_ID, assignee_id: CHILD_ID,
    task_id: '00000000-0000-0000-0000-000000000033',
    goal_name: '皿洗いを月10回する',
    goal_reward: 200, target_count: 10,
    and_condition_flag: false,
    status: 'pending_approval', target_month: '2026-06',
  },
]));

// ============================================================
// 6. 報酬（rewards）
//
// 集計値の根拠:
//   2026-01〜04: 過去データ（状況を合わせた代表値）
//   2026-05: task=600（task_completions 合計），bonus=300（goal 達成）→ 900
//   2026-06: task=100（ゴミ出し approved），bonus=0（達成済み目標なし）→ 100
//            status=pending のため API アクセス時に動的再計算される
// ============================================================

await run('rewards を挿入', () => insert('rewards', [
  {
    id: '00000000-0000-0000-0000-000000000061',
    group_id: GROUP_ID, child_id: CHILD_ID, target_month: '2026-01',
    task_reward_total: 250, bonus_reward_total: 0, total_amount: 250,
    status: 'paid', paid_at: '2026-02-01T00:00:00Z',
    evaluation_score: 4, evaluation_comment: 'よく頑張りました！',
  },
  {
    id: '00000000-0000-0000-0000-000000000062',
    group_id: GROUP_ID, child_id: CHILD_ID, target_month: '2026-02',
    task_reward_total: 320, bonus_reward_total: 100, total_amount: 420,
    status: 'paid', paid_at: '2026-03-01T00:00:00Z',
    evaluation_score: 5, evaluation_comment: '目標も達成できたね！素晴らしい！',
  },
  {
    id: '00000000-0000-0000-0000-000000000063',
    group_id: GROUP_ID, child_id: CHILD_ID, target_month: '2026-03',
    task_reward_total: 380, bonus_reward_total: 0, total_amount: 380,
    status: 'paid', paid_at: '2026-04-01T00:00:00Z',
    evaluation_score: 3, evaluation_comment: '来月はもっと頑張ろう',
  },
  {
    id: '00000000-0000-0000-0000-000000000064',
    group_id: GROUP_ID, child_id: CHILD_ID, target_month: '2026-04',
    task_reward_total: 420, bonus_reward_total: 200, total_amount: 620,
    status: 'paid', paid_at: '2026-05-01T00:00:00Z',
    evaluation_score: 4, evaluation_comment: '目標達成おめでとう！調子いいね',
  },
  {
    id: '00000000-0000-0000-0000-000000000065',
    group_id: GROUP_ID, child_id: CHILD_ID, target_month: '2026-05',
    // task: 50+80+200+150+120=600（task_completions.confirmed_reward 合計と一致）
    // bonus: 300（goal「毎日ゴミ出しをする」achieved の goal_reward と一致）
    task_reward_total: 600, bonus_reward_total: 300, total_amount: 900,
    status: 'paid', paid_at: '2026-06-01T00:00:00Z',
    evaluation_score: 5, evaluation_comment: '先月は本当によく頑張りました！全タスクをこなして素晴らしい！',
  },
  {
    id: '00000000-0000-0000-0000-000000000060',
    group_id: GROUP_ID, child_id: CHILD_ID, target_month: '2026-06',
    // 100: ゴミ出し confirmed_reward（API アクセス時に動的再計算で上書きされる）
    task_reward_total: 100, bonus_reward_total: 0, total_amount: 100,
    status: 'pending', paid_at: null,
  },
]));

// ============================================================
// 7. 完了確認
// ============================================================

const [tasks, completions, goals, rewards] = await Promise.all([
  db.from('tasks').select('id,task_name,status,reward_amount').order('created_at'),
  db.from('task_completions').select('id,task_id,confirmed_reward,approved_at').eq('deleted_flag', false),
  db.from('goals').select('id,goal_name,status,goal_reward,target_month').order('target_month'),
  db.from('rewards').select('id,target_month,task_reward_total,bonus_reward_total,total_amount,status').order('target_month'),
]);

console.log('\n=== 完了サマリー ===');
console.log(`tasks:            ${tasks.data?.length} 件`);
console.log(`task_completions: ${completions.data?.length} 件`);
console.log(`goals:            ${goals.data?.length} 件`);
console.log(`rewards:          ${rewards.data?.length} 件`);

console.log('\n--- タスク（ステータス別）---');
const grouped = {};
for (const t of tasks.data ?? []) {
  grouped[t.status] = (grouped[t.status] ?? []);
  grouped[t.status].push(`${t.task_name}(${t.reward_amount}円)`);
}
for (const [status, list] of Object.entries(grouped)) {
  console.log(`  ${status}: ${list.join(', ')}`);
}

console.log('\n--- 目標（月別）---');
for (const g of goals.data ?? []) {
  console.log(`  ${g.target_month} [${g.status}] ${g.goal_name} (ボーナス${g.goal_reward}円)`);
}

console.log('\n--- 報酬（月別）---');
for (const r of rewards.data ?? []) {
  console.log(
    `  ${r.target_month}: task=${r.task_reward_total}円 + bonus=${r.bonus_reward_total}円 = ${r.total_amount}円 [${r.status}]`
  );
}

console.log('\n✅ シードデータの投入が完了しました');
process.exit(0);
