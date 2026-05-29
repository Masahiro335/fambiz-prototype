import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js';
import WebSocket from 'ws';
import { fromZonedTime } from 'date-fns-tz';
import type { Task, TaskStatus } from '@fambiz/types';

/**
 * タスク一覧取得のフィルタ条件。
 */
export interface FindTasksFilter {
  groupId: string;
  status?: TaskStatus;
  assigneeId?: string;
  keyword?: string;
  month?: string; // YYYY-MM形式（FUN-TASK-005）
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

    // 月フィルタ: JST月初・翌月初をUTCに変換して due_date または start_time が含まれるタスクをフィルタする（FUN-TASK-005）
    if (filter.month) {
      const [year, mon] = filter.month.split('-').map(Number);
      const TZ = 'Asia/Tokyo';
      // JSTの月初・翌月初をUTCに変換する
      const startUtc = fromZonedTime(new Date(year, mon - 1, 1, 0, 0, 0), TZ);
      const endUtc = fromZonedTime(new Date(year, mon, 1, 0, 0, 0), TZ);
      const startISO = startUtc.toISOString();
      const endISO = endUtc.toISOString();
      // due_date または start_time が該当月（JST）に含まれるタスクをフィルタする
      query = query.or(
        `and(due_date.gte.${startISO},due_date.lt.${endISO}),and(start_time.gte.${startISO},start_time.lt.${endISO})`,
      );
    }

    // 作成日時の降順で返す
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('タスク一覧の取得に失敗しました');
    }

    return data ?? [];
  }

  /**
   * タスクを更新する。
   * group_id と deleted_flag フィルタで家族グループのデータ分離と論理削除を保証する。
   * @param taskId - 更新対象のタスクID
   * @param groupId - 家族グループID（データ分離用）
   * @param fields - 更新するフィールド（undefined のフィールドは除外される）
   * @returns 更新されたタスクオブジェクト、対象が存在しない場合は null
   */
  async updateTask(
    taskId: string,
    groupId: string,
    fields: {
      assignee_id?: string;
      task_name?: string;
      category?: string;
      reward_amount?: number;
      start_time?: string;
      end_time?: string;
      due_date?: string;
      memo?: string;
    },
  ): Promise<Task | null> {
    // undefined のフィールドを除外して更新対象のみ抽出する
    const updateData = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );

    const { data, error } = await this.db
      .from('tasks')
      .update(updateData)
      // 家族グループ分離: 自グループのタスクのみ更新する
      .eq('id', taskId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select(
        'id, group_id, creator_id, assignee_id, task_name, category, reward_amount, status, start_time, end_time, due_date, memo, created_at, updated_at',
      )
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('タスクの更新に失敗しました');
    }

    return data ?? null;
  }

  /**
   * タスクをソフトデリートする（deleted_flag = true に更新）。
   * group_id と deleted_flag フィルタで家族グループのデータ分離と二重削除を防止する。
   * @param taskId - 削除対象のタスクID
   * @param groupId - 家族グループID（データ分離用）
   * @returns 削除に成功した場合は true、対象が存在しない場合は false
   */
  async deleteTask(taskId: string, groupId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('tasks')
      .update({ deleted_flag: true })
      // 家族グループ分離: 自グループのタスクのみ削除する
      .eq('id', taskId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('タスクの削除に失敗しました');
    }

    return data !== null;
  }

  /**
   * タスクのステータスを更新する（FUN-TASK-004）。
   * group_id と deleted_flag フィルタで家族グループのデータ分離を保証する。
   * @param taskId - 更新対象のタスクID
   * @param groupId - 家族グループID（データ分離用）
   * @param status - 変更後のステータス
   * @returns 更新されたタスクオブジェクト、対象が存在しない場合は null
   */
  async updateTaskStatus(
    taskId: string,
    groupId: string,
    status: TaskStatus,
  ): Promise<Task | null> {
    const { data, error } = await this.db
      .from('tasks')
      .update({ status })
      // 家族グループ分離: 自グループのタスクのみ更新する
      .eq('id', taskId)
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .select(
        'id, group_id, creator_id, assignee_id, task_name, category, reward_amount, status, start_time, end_time, due_date, memo, created_at, updated_at',
      )
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('タスクステータスの更新に失敗しました');
    }

    return data ?? null;
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
