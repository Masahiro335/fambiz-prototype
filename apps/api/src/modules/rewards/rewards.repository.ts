import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { Reward, TaskCompletion } from '@fambiz/types';

/**
 * 報酬管理のデータアクセスを担当するリポジトリ。
 * Supabase（service_role）を使って rewards / task_completions / goals テーブルを操作する。
 */
@Injectable()
export class RewardsRepository {
  /**
   * DBクエリ専用クライアント（service_role、RLSバイパス）。
   */
  private readonly db: SupabaseClient<any>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    // ws パッケージの WebSocket を Supabase が要求する型に変換（Node.js 20 対応）
    const opts: SupabaseClientOptions<'public'> = {
      realtime: { transport: WebSocket as unknown as WebSocketLikeConstructor },
    };
    this.db = createClient<any, 'public'>(url, serviceRoleKey, opts);
  }

  /**
   * child_id と target_month で報酬レコードを1件取得する。
   * @param childId - 子ユーザーID
   * @param targetMonth - 対象月（YYYY-MM形式）
   * @returns 報酬が存在する場合は Reward オブジェクト、存在しない場合は null
   */
  async findByChildAndMonth(childId: string, targetMonth: string): Promise<Reward | null> {
    const { data, error } = await this.db
      .from('rewards')
      .select(
        'id, group_id, child_id, target_month, task_reward_total, bonus_reward_total, total_amount, evaluation_score, evaluation_comment, status, paid_at, created_at, updated_at',
      )
      .eq('child_id', childId)
      .eq('target_month', targetMonth)
      .eq('deleted_flag', false)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('報酬の取得に失敗しました');
    }

    return data ?? null;
  }

  /**
   * 報酬IDで報酬レコードを1件取得する。
   * group_id フィルタで家族グループのデータ分離を保証する。
   * @param rewardId - 報酬ID
   * @param groupId - 家族グループID（データ分離用）
   * @returns 報酬が存在する場合は Reward オブジェクト、存在しない場合は null
   */
  async findById(rewardId: string, groupId: string): Promise<Reward | null> {
    const { data, error } = await this.db
      .from('rewards')
      .select(
        'id, group_id, child_id, target_month, task_reward_total, bonus_reward_total, total_amount, evaluation_score, evaluation_comment, status, paid_at, created_at, updated_at',
      )
      .eq('id', rewardId)
      // 家族グループ分離: 自グループの報酬のみ取得する
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('報酬の取得に失敗しました');
    }

    return data ?? null;
  }

  /**
   * 指定した子ユーザーの月次報酬を複数月分取得する。
   * @param childId - 子ユーザーID
   * @param groupId - 家族グループID（データ分離用）
   * @param months - 取得対象の月リスト（YYYY-MM形式）
   * @returns 報酬の配列（target_month 昇順）
   */
  async findByChildAndMonths(
    childId: string,
    groupId: string,
    months: string[],
  ): Promise<Reward[]> {
    const { data, error } = await this.db
      .from('rewards')
      .select(
        'id, group_id, child_id, target_month, task_reward_total, bonus_reward_total, total_amount, evaluation_score, evaluation_comment, status, paid_at, created_at, updated_at',
      )
      .eq('child_id', childId)
      // 家族グループ分離: 自グループの報酬のみ取得する
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .in('target_month', months)
      .order('target_month', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('報酬グラフデータの取得に失敗しました');
    }

    return data ?? [];
  }

  /**
   * 報酬レコードを新規作成する（INSERT）。
   * @param groupId - 家族グループID
   * @param childId - 子ユーザーID
   * @param targetMonth - 対象月（YYYY-MM形式）
   * @param taskRewardTotal - タスク報酬合計金額
   * @param bonusRewardTotal - ボーナス報酬合計金額
   * @param totalAmount - 総報酬金額
   * @returns 作成された報酬オブジェクト
   */
  async create(
    groupId: string,
    childId: string,
    targetMonth: string,
    taskRewardTotal: number,
    bonusRewardTotal: number,
    totalAmount: number,
  ): Promise<Reward> {
    const { data, error } = await this.db
      .from('rewards')
      .insert({
        group_id: groupId,
        child_id: childId,
        target_month: targetMonth,
        task_reward_total: taskRewardTotal,
        bonus_reward_total: bonusRewardTotal,
        total_amount: totalAmount,
      })
      .select(
        'id, group_id, child_id, target_month, task_reward_total, bonus_reward_total, total_amount, evaluation_score, evaluation_comment, status, paid_at, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('報酬レコードの作成に失敗しました');
    }

    return data;
  }

  /**
   * 既存の報酬レコードの集計金額を更新する（pending ステータスの場合のみ再計算）。
   * @param rewardId - 更新対象の報酬ID
   * @param taskRewardTotal - タスク報酬合計金額（再計算後）
   * @param bonusRewardTotal - ボーナス報酬合計金額（再計算後）
   * @param totalAmount - 総報酬金額（再計算後）
   * @returns 更新された報酬オブジェクト
   */
  async updateAmounts(
    rewardId: string,
    taskRewardTotal: number,
    bonusRewardTotal: number,
    totalAmount: number,
  ): Promise<Reward> {
    const { data, error } = await this.db
      .from('rewards')
      .update({
        task_reward_total: taskRewardTotal,
        bonus_reward_total: bonusRewardTotal,
        total_amount: totalAmount,
      })
      .eq('id', rewardId)
      .select(
        'id, group_id, child_id, target_month, task_reward_total, bonus_reward_total, total_amount, evaluation_score, evaluation_comment, status, paid_at, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('報酬金額の更新に失敗しました');
    }

    return data;
  }

  /**
   * 報酬に評価スコアとコメントを登録する（親のみ実行可能）。
   * @param rewardId - 対象の報酬ID
   * @param groupId - 家族グループID（データ分離用）
   * @param evaluationScore - 評価スコア（1〜5）
   * @param evaluationComment - 評価コメント（任意）
   * @returns 更新された報酬オブジェクト、対象が存在しない場合は null
   */
  async updateEvaluation(
    rewardId: string,
    groupId: string,
    evaluationScore: number,
    evaluationComment?: string,
  ): Promise<Reward | null> {
    const { data, error } = await this.db
      .from('rewards')
      .update({
        evaluation_score: evaluationScore,
        evaluation_comment: evaluationComment ?? null,
      })
      // 家族グループ分離: 自グループの報酬のみ更新する
      .eq('id', rewardId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select(
        'id, group_id, child_id, target_month, task_reward_total, bonus_reward_total, total_amount, evaluation_score, evaluation_comment, status, paid_at, created_at, updated_at',
      )
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('評価の登録に失敗しました');
    }

    return data ?? null;
  }

  /**
   * 報酬ステータスを paid に更新する（支払い完了処理・親のみ実行可能）。
   * @param rewardId - 対象の報酬ID
   * @param groupId - 家族グループID（データ分離用）
   * @param paidAt - 支払い完了日時（ISO 8601）
   * @returns 更新された報酬オブジェクト、対象が存在しない場合は null
   */
  async markAsPaid(rewardId: string, groupId: string, paidAt: string): Promise<Reward | null> {
    const { data, error } = await this.db
      .from('rewards')
      .update({
        status: 'paid',
        paid_at: paidAt,
      })
      // 家族グループ分離: 自グループの報酬のみ更新する
      .eq('id', rewardId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select(
        'id, group_id, child_id, target_month, task_reward_total, bonus_reward_total, total_amount, evaluation_score, evaluation_comment, status, paid_at, created_at, updated_at',
      )
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('支払い完了処理に失敗しました');
    }

    return data ?? null;
  }

  /**
   * 指定した報酬に紐づくタスク完了履歴一覧を取得する。
   * tasks テーブルと JOIN して group_id フィルタを適用する。
   * @param childId - 子ユーザーID
   * @param groupId - 家族グループID（データ分離用）
   * @param targetMonth - 対象月（YYYY-MM形式）
   * @returns タスク完了履歴の配列（approved_at 昇順）
   */
  async findCompletionsByMonth(
    childId: string,
    groupId: string,
    targetMonth: string,
  ): Promise<TaskCompletion[]> {
    // JST の月初・月末を UTC タイムスタンプに変換する（ADR-0004: Asia/Tokyo で処理）
    const [year, month] = targetMonth.split('-').map(Number);
    // JST 月初 0:00 を UTC に変換（UTC-9h）
    const startJst = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const startUtc = new Date(startJst.getTime() - 9 * 60 * 60 * 1000);
    // JST 翌月初 0:00 を UTC に変換（UTC-9h）
    const endJst = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const endUtc = new Date(endJst.getTime() - 9 * 60 * 60 * 1000);

    const { data, error } = await this.db
      .from('task_completions')
      .select(
        'id, task_id, child_id, reported_at, approved_by, approved_at, confirmed_reward, created_at, updated_at, tasks!inner(group_id, task_name, category)',
      )
      .eq('child_id', childId)
      .eq('deleted_flag', false)
      // tasks テーブルとの JOIN で group_id フィルタを適用する（家族グループ分離）
      .eq('tasks.group_id', groupId)
      .gte('approved_at', startUtc.toISOString())
      .lt('approved_at', endUtc.toISOString())
      .not('approved_at', 'is', null)
      .order('approved_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('タスク完了履歴の取得に失敗しました');
    }

    // tasks の JOIN データをフラットに展開して TaskCompletion 型として返す
    return (data ?? []).map((row: Record<string, unknown>) => {
      const { tasks, ...completion } = row;
      const taskData = tasks as Record<string, unknown> | null;
      return {
        ...completion,
        task_name: taskData?.task_name ?? undefined,
        category: taskData?.category ?? undefined,
      } as unknown as TaskCompletion;
    });
  }

  /**
   * 対象月のタスク報酬合計を計算する。
   * tasks テーブルと JOIN して group_id フィルタを適用する。
   * approved_at が targetMonth の JST 範囲内の confirmed_reward を合計する。
   * @param childId - 子ユーザーID
   * @param groupId - 家族グループID（tasks 経由でフィルタ）
   * @param targetMonth - 対象月（YYYY-MM形式）
   * @returns タスク報酬合計（Math.floor 適用済み）
   */
  async calcTaskRewardTotal(
    childId: string,
    groupId: string,
    targetMonth: string,
  ): Promise<number> {
    // JST の月初・月末を UTC タイムスタンプに変換する（ADR-0004: Asia/Tokyo で処理）
    const [year, month] = targetMonth.split('-').map(Number);
    const startJst = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const startUtc = new Date(startJst.getTime() - 9 * 60 * 60 * 1000);
    const endJst = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const endUtc = new Date(endJst.getTime() - 9 * 60 * 60 * 1000);

    const { data, error } = await this.db
      .from('task_completions')
      .select('confirmed_reward, tasks!inner(group_id)')
      .eq('child_id', childId)
      .eq('deleted_flag', false)
      // tasks テーブルとの JOIN で group_id フィルタを適用する（家族グループ分離）
      .eq('tasks.group_id', groupId)
      .gte('approved_at', startUtc.toISOString())
      .lt('approved_at', endUtc.toISOString())
      .not('approved_at', 'is', null);

    if (error) {
      throw new InternalServerErrorException('タスク報酬集計に失敗しました');
    }

    // confirmed_reward を合計し端数を切り捨てる（ADR-0004: Math.floor 必須）
    const rawTotal = (data ?? []).reduce(
      (sum: number, row: Record<string, unknown>) =>
        sum + (typeof row.confirmed_reward === 'number' ? row.confirmed_reward : 0),
      0,
    );
    return Math.floor(rawTotal);
  }

  /**
   * 対象月のボーナス報酬合計を計算する。
   * goals テーブルから achieved ステータスの goal_reward を合計する。
   * @param childId - 子ユーザーID（assignee_id）
   * @param groupId - 家族グループID
   * @param targetMonth - 対象月（YYYY-MM形式）
   * @returns ボーナス報酬合計（Math.floor 適用済み）
   */
  async calcBonusRewardTotal(
    childId: string,
    groupId: string,
    targetMonth: string,
  ): Promise<number> {
    const { data, error } = await this.db
      .from('goals')
      .select('goal_reward')
      .eq('assignee_id', childId)
      // 家族グループ分離: 自グループの目標のみ集計する
      .eq('group_id', groupId)
      .eq('target_month', targetMonth)
      .eq('status', 'achieved')
      .eq('deleted_flag', false);

    if (error) {
      throw new InternalServerErrorException('ボーナス報酬集計に失敗しました');
    }

    // goal_reward を合計し端数を切り捨てる（ADR-0004: Math.floor 必須）
    const rawTotal = (data ?? []).reduce(
      (sum: number, row: Record<string, unknown>) =>
        sum + (typeof row.goal_reward === 'number' ? row.goal_reward : 0),
      0,
    );
    return Math.floor(rawTotal);
  }
}
