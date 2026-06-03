import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { Goal, GoalStatus } from '@fambiz/types';

/**
 * 目標のデータアクセスを担当するリポジトリ。
 * Supabase（service_role）を使って goals テーブルを操作する。
 */
@Injectable()
export class GoalsRepository {
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
   * 目標一覧を取得する。
   * group_id と deleted_flag フィルタで家族グループのデータ分離を保証する。
   * @param groupId - 家族グループID（必須）
   * @param targetMonth - 対象月（YYYY-MM形式・任意）
   * @param assigneeId - 担当者ユーザーID（任意）
   * @returns 目標の配列（作成日時降順）
   */
  async findAll(groupId: string, targetMonth?: string, assigneeId?: string): Promise<Goal[]> {
    let query = this.db
      .from('goals')
      .select(
        'id, group_id, creator_id, assignee_id, task_id, goal_name, goal_reward, target_count, action, and_condition_flag, status, target_month, created_at, updated_at',
      )
      // 家族グループ分離: 自グループの目標のみ取得する
      .eq('group_id', groupId)
      .eq('deleted_flag', false);

    // 対象月フィルタ（指定された場合のみ）
    if (targetMonth) {
      query = query.eq('target_month', targetMonth);
    }

    // 担当者フィルタ（指定された場合のみ）
    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }

    // 作成日時の降順で返す
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('目標一覧の取得に失敗しました');
    }

    return data ?? [];
  }

  /**
   * 目標IDで特定の目標を1件取得する。
   * group_id フィルタで家族グループのデータ分離を保証する。
   * @param goalId - 目標ID
   * @param groupId - 家族グループID（データ分離用）
   * @returns 目標が存在する場合は Goal オブジェクト、存在しない場合は null
   */
  async findById(goalId: string, groupId: string): Promise<Goal | null> {
    const { data, error } = await this.db
      .from('goals')
      .select(
        'id, group_id, creator_id, assignee_id, task_id, goal_name, goal_reward, target_count, action, and_condition_flag, status, target_month, created_at, updated_at',
      )
      .eq('id', goalId)
      // 家族グループ分離: 自グループの目標のみ取得する
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('目標の取得に失敗しました');
    }

    return data ?? null;
  }

  /**
   * 新しい目標を作成する。
   * @param groupId - 家族グループID
   * @param creatorId - 作成者（親）のユーザーID
   * @param goalName - 目標名
   * @param goalReward - 目標達成ボーナス報酬金額
   * @param targetMonth - 対象月（YYYY-MM形式）
   * @param assigneeId - 担当者（子）のユーザーID（任意）
   * @param taskId - 紐付けるタスクID（任意）
   * @param targetCount - 目標回数（任意）
   * @param action - 行動内容（任意）
   * @param andConditionFlag - AND条件フラグ
   * @returns 作成された目標オブジェクト
   */
  async create(
    groupId: string,
    creatorId: string,
    goalName: string,
    goalReward: number,
    targetMonth: string,
    assigneeId?: string,
    taskId?: string,
    targetCount?: number,
    action?: string,
    andConditionFlag?: boolean,
  ): Promise<Goal> {
    const { data, error } = await this.db
      .from('goals')
      .insert({
        group_id: groupId,
        creator_id: creatorId,
        assignee_id: assigneeId ?? null,
        task_id: taskId ?? null,
        goal_name: goalName,
        goal_reward: goalReward,
        target_count: targetCount ?? null,
        action: action ?? null,
        and_condition_flag: andConditionFlag ?? false,
        target_month: targetMonth,
      })
      .select(
        'id, group_id, creator_id, assignee_id, task_id, goal_name, goal_reward, target_count, action, and_condition_flag, status, target_month, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('目標の作成に失敗しました');
    }

    return data;
  }

  /**
   * 目標を更新する。
   * group_id と deleted_flag フィルタで家族グループのデータ分離と論理削除を保証する。
   * @param goalId - 更新対象の目標ID
   * @param groupId - 家族グループID（データ分離用）
   * @param fields - 更新するフィールド（undefined のフィールドは除外される）
   * @returns 更新された目標オブジェクト、対象が存在しない場合は null
   */
  async update(
    goalId: string,
    groupId: string,
    fields: {
      goal_name?: string;
      goal_reward?: number;
      target_month?: string;
      assignee_id?: string;
      task_id?: string;
      target_count?: number;
      action?: string;
      and_condition_flag?: boolean;
    },
  ): Promise<Goal | null> {
    // undefined のフィールドを除外して更新対象のみ抽出する
    const updateData = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );

    const { data, error } = await this.db
      .from('goals')
      .update(updateData)
      // 家族グループ分離: 自グループの目標のみ更新する
      .eq('id', goalId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select(
        'id, group_id, creator_id, assignee_id, task_id, goal_name, goal_reward, target_count, action, and_condition_flag, status, target_month, created_at, updated_at',
      )
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('目標の更新に失敗しました');
    }

    return data ?? null;
  }

  /**
   * 目標をソフトデリートする（deleted_flag = true に更新）。
   * group_id と deleted_flag フィルタで家族グループのデータ分離と二重削除を防止する。
   * @param goalId - 削除対象の目標ID
   * @param groupId - 家族グループID（データ分離用）
   * @returns 削除に成功した場合は true、対象が存在しない場合は false
   */
  async delete(goalId: string, groupId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('goals')
      .update({ deleted_flag: true })
      // 家族グループ分離: 自グループの目標のみ削除する
      .eq('id', goalId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('目標の削除に失敗しました');
    }

    return data !== null;
  }

  /**
   * 目標のステータスを更新する（FUN-GOAL-005）。
   * group_id と deleted_flag フィルタで家族グループのデータ分離を保証する。
   * @param goalId - 更新対象の目標ID
   * @param groupId - 家族グループID（データ分離用）
   * @param status - 変更後のステータス
   * @returns 更新された目標オブジェクト、対象が存在しない場合は null
   */
  async updateStatus(goalId: string, groupId: string, status: GoalStatus): Promise<Goal | null> {
    const { data, error } = await this.db
      .from('goals')
      .update({ status })
      // 家族グループ分離: 自グループの目標のみ更新する
      .eq('id', goalId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select(
        'id, group_id, creator_id, assignee_id, task_id, goal_name, goal_reward, target_count, action, and_condition_flag, status, target_month, created_at, updated_at',
      )
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('目標ステータスの更新に失敗しました');
    }

    return data ?? null;
  }
}
