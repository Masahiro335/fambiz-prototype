import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { Task, TaskStatus } from '@fambiz/types';

/**
 * タスク一覧取得のフィルタ条件。
 */
export interface FindTasksFilter {
  groupId: string;
  status?: TaskStatus;
  assigneeId?: string;
  keyword?: string;
}

/**
 * タスクのデータアクセスを担当するリポジトリ。
 * Supabase（service_role）を使って tasks テーブルを操作する。
 */
@Injectable()
export class TasksRepository {
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
   * 新しいタスクを作成する。
   * @param groupId - 家族グループID
   * @param creatorId - 作成者（親）のユーザーID
   * @param assigneeId - 担当者（子）のユーザーID（任意）
   * @param taskName - タスク名
   * @param category - カテゴリ（任意）
   * @param rewardAmount - 報酬金額
   * @param startTime - タスク開始時刻（任意）
   * @param endTime - タスク終了時刻（任意）
   * @param dueDate - 期日（任意）
   * @param memo - メモ（任意）
   * @returns 作成されたタスクオブジェクト
   */
  async createTask(
    groupId: string,
    creatorId: string,
    assigneeId: string | undefined,
    taskName: string,
    category: string | undefined,
    rewardAmount: number,
    startTime: string | undefined,
    endTime: string | undefined,
    dueDate: string | undefined,
    memo: string | undefined,
  ): Promise<Task> {
    const { data, error } = await this.db
      .from('tasks')
      .insert({
        group_id: groupId,
        creator_id: creatorId,
        assignee_id: assigneeId ?? null,
        task_name: taskName,
        category: category ?? null,
        reward_amount: rewardAmount,
        start_time: startTime ?? null,
        end_time: endTime ?? null,
        due_date: dueDate ?? null,
        memo: memo ?? null,
      })
      .select(
        'id, group_id, creator_id, assignee_id, task_name, category, reward_amount, status, start_time, end_time, due_date, memo, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('タスクの作成に失敗しました');
    }

    return data;
  }

  /**
   * フィルタ条件に一致するタスク一覧を取得する。
   * group_id フィルタで家族グループのデータ分離を保証する。
   * @param filter - フィルタ条件（groupId は必須）
   * @returns タスクの配列（作成日時降順）
   */
  async findAll(filter: FindTasksFilter): Promise<Task[]> {
    let query = this.db
      .from('tasks')
      .select(
        'id, group_id, creator_id, assignee_id, task_name, category, reward_amount, status, start_time, end_time, due_date, memo, created_at, updated_at',
      )
      // 家族グループ分離: 自グループのタスクのみ取得する
      .eq('group_id', filter.groupId)
      .eq('deleted_flag', false);

    // ステータスフィルタ（指定された場合のみ）
    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    // 担当者フィルタ（指定された場合のみ）
    if (filter.assigneeId) {
      query = query.eq('assignee_id', filter.assigneeId);
    }

    // キーワード検索（task_name に対して部分一致）
    if (filter.keyword) {
      query = query.ilike('task_name', `%${filter.keyword}%`);
    }

    // 作成日時の降順で返す
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('タスク一覧の取得に失敗しました');
    }

    return data ?? [];
  }

  /**
   * タスクIDで特定のタスクを1件取得する。
   * group_id フィルタで家族グループのデータ分離を保証する。
   * @param taskId - タスクID
   * @param groupId - 家族グループID（データ分離用）
   * @returns タスクが存在する場合は Task オブジェクト、存在しない場合は null
   */
  async findById(taskId: string, groupId: string): Promise<Task | null> {
    const { data, error } = await this.db
      .from('tasks')
      .select(
        'id, group_id, creator_id, assignee_id, task_name, category, reward_amount, status, start_time, end_time, due_date, memo, created_at, updated_at',
      )
      .eq('id', taskId)
      // 家族グループ分離: 自グループのタスクのみ取得する
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('タスクの取得に失敗しました');
    }

    return data ?? null;
  }
}
