import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Task, TaskStatus, JwtPayload } from '@fambiz/types';
import { TasksRepository } from './tasks.repository';
import { RewardsRepository } from '../rewards/rewards.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

/**
 * タスク管理のビジネスロジックを担当するサービス。
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly rewardsRepository: RewardsRepository,
  ) {}

  /**
   * 新しいタスクを作成する（FUN-TASK-001）。
   *
   * セキュリティチェック:
   * - リクエストの groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー
   * - 他家族グループへのタスク作成を絶対に許容しない（業務ルール必須）
   *
   * @param dto - タスク作成リクエスト DTO
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 作成されたタスクオブジェクト
   */
  async createTask(dto: CreateTaskDto, user: JwtPayload): Promise<Task> {
    // 自分が所属するグループ以外へのタスク作成を禁止する
    if (dto.groupId !== user.family_group_id) {
      throw new ForbiddenException('他の家族グループにタスクを作成することはできません');
    }

    // assigneeId が指定されている場合、同一ファミリーグループに属するか検証する
    if (dto.assigneeId) {
      const isMember = await this.tasksRepository.isMemberOfGroup(dto.assigneeId, dto.groupId);
      if (!isMember) {
        throw new ForbiddenException('指定された担当者は同一ファミリーグループに属していません');
      }
    }

    return this.tasksRepository.createTask(
      dto.groupId,
      user.sub,
      dto.assigneeId,
      dto.taskName,
      dto.category,
      dto.rewardAmount,
      dto.startTime,
      dto.endTime,
      dto.dueDate,
      dto.memo,
    );
  }

  /**
   * タスク一覧を取得する（FUN-TASK-001）。
   *
   * セキュリティチェック:
   * - リクエストの groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー
   * - 他家族グループのタスク一覧参照を絶対に許容しない（業務ルール必須）
   *
   * @param groupId - 取得対象のグループID（クエリパラメータ）
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @param status - タスクステータスフィルタ（任意）
   * @param assigneeId - 担当者フィルタ（任意）
   * @param keyword - キーワード検索（任意）
   * @param month - カレンダー表示用の対象月（YYYY-MM形式・任意、FUN-TASK-005）
   * @param category - カテゴリフィルタ（任意、FUN-TASK-007）
   * @returns タスクの配列
   */
  async findAll(
    groupId: string,
    user: JwtPayload,
    status?: TaskStatus,
    assigneeId?: string,
    keyword?: string,
    month?: string,
    category?: string,
  ): Promise<Task[]> {
    // 自分が所属するグループ以外のタスク参照を禁止する
    if (groupId !== user.family_group_id) {
      throw new ForbiddenException('他の家族グループのタスクは参照できません');
    }

    // 子ロールの場合は自分のタスクのみ参照可能（assigneeId を強制的に user.sub で上書き）
    const effectiveAssigneeId = user.role === 'child' ? user.sub : assigneeId;

    return this.tasksRepository.findAll({
      groupId,
      status,
      assigneeId: effectiveAssigneeId,
      keyword,
      month,
      category,
    });
  }

  /**
   * 既存タスクを更新する（FUN-TASK-002）。
   *
   * セキュリティチェック:
   * - リポジトリ側で group_id フィルタを適用するため、他グループへの更新は不可
   * - 更新結果が null の場合は対象タスクが存在しないとして NotFoundException をスロー
   *
   * @param taskId - 更新対象のタスクID
   * @param dto - タスク更新リクエスト DTO（全フィールドオプション）
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 更新されたタスクオブジェクト
   * @throws NotFoundException タスクが存在しない、または他グループのタスクにアクセスした場合
   */
  async updateTask(taskId: string, dto: UpdateTaskDto, user: JwtPayload): Promise<Task> {
    // DTOのキャメルケースをDBのスネークケースに変換して渡す
    const updated = await this.tasksRepository.updateTask(taskId, user.family_group_id, {
      assignee_id: dto.assigneeId,
      task_name: dto.taskName,
      category: dto.category,
      reward_amount: dto.rewardAmount,
      start_time: dto.startTime,
      end_time: dto.endTime,
      due_date: dto.dueDate,
      memo: dto.memo,
    });

    if (!updated) {
      throw new NotFoundException('タスクが見つかりません');
    }

    return updated;
  }

  /**
   * タスクをソフトデリートする（FUN-TASK-003）。
   *
   * セキュリティチェック:
   * - リポジトリ側で group_id フィルタを適用するため、他グループのタスクへの削除は不可
   * - 削除結果が false の場合は対象タスクが存在しないとして NotFoundException をスロー
   *
   * @param taskId - 削除対象のタスクID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 削除完了メッセージ
   * @throws NotFoundException タスクが存在しない、または他グループのタスクにアクセスした場合
   */
  async deleteTask(taskId: string, user: JwtPayload): Promise<{ message: string }> {
    const deleted = await this.tasksRepository.deleteTask(taskId, user.family_group_id);

    if (!deleted) {
      throw new NotFoundException('タスクが見つかりません');
    }

    return { message: 'タスクを削除しました' };
  }

  /**
   * タスクのステータスを変更する（FUN-TASK-004）。
   *
   * ステータス遷移ルール:
   * - pending → reported   : 子（child）のみ可（実行報告）
   * - reported → completed : 親（parent）のみ可（承認）
   * - reported → pending   : 親（parent）のみ可（差し戻し）
   * - pending → cancelled  : 子（child）のみ可（取り下げ）
   * - reported → cancelled : 子（child）のみ可（取り下げ）
   * - completed / expired / cancelled からの遷移: 不可
   *
   * セキュリティチェック:
   * - リポジトリ側で group_id フィルタを適用するため、他グループへの操作は不可
   * - ステータス遷移のロール違反は ForbiddenException をスロー
   * - 不正遷移は BadRequestException をスロー
   *
   * @param taskId - 更新対象のタスクID
   * @param dto - ステータス変更リクエスト DTO
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 更新されたタスクオブジェクト
   * @throws NotFoundException タスクが存在しない、または他グループのタスクにアクセスした場合
   * @throws ForbiddenException ロールに許可されていない遷移を試みた場合
   * @throws BadRequestException 不正なステータス遷移の場合
   */
  async updateTaskStatus(
    taskId: string,
    dto: UpdateTaskStatusDto,
    user: JwtPayload,
  ): Promise<Task> {
    // 現在のタスクを取得してステータスを確認する（group_id フィルタで他グループ分離も兼ねる）
    const currentTask = await this.tasksRepository.findById(taskId, user.family_group_id);

    if (!currentTask) {
      throw new NotFoundException('タスクが見つかりません');
    }

    const from = currentTask.status;
    const to = dto.status;
    const role = user.role;

    // 終端ステータスからの遷移は全ロールに対して不可
    if (from === 'completed' || from === 'expired' || from === 'cancelled') {
      throw new BadRequestException(`ステータス "${from}" のタスクは変更できません`);
    }

    // ステータス遷移のロール・組み合わせを検証する
    if (from === 'pending' && to === 'reported') {
      // 実行報告: 子のみ可
      if (role !== 'child') {
        throw new ForbiddenException('実行報告は子のみ行えます');
      }
    } else if (from === 'reported' && to === 'completed') {
      // 承認: 親のみ可
      if (role !== 'parent') {
        throw new ForbiddenException('承認は親のみ行えます');
      }
    } else if (from === 'reported' && to === 'pending') {
      // 差し戻し: 親のみ可
      if (role !== 'parent') {
        throw new ForbiddenException('差し戻しは親のみ行えます');
      }
    } else if (from === 'pending' && to === 'completed') {
      // 即時完了（編集画面からの直接承認）: 親のみ可
      if (role !== 'parent') {
        throw new ForbiddenException('即時完了は親のみ行えます');
      }
    } else if (from === 'pending' && to === 'cancelled') {
      // 取り下げ（pending）: 子のみ可
      if (role !== 'child') {
        throw new ForbiddenException('取り下げは子のみ行えます');
      }
    } else if (from === 'reported' && to === 'cancelled') {
      // 取り下げ（reported）: 子のみ可
      if (role !== 'child') {
        throw new ForbiddenException('取り下げは子のみ行えます');
      }
    } else {
      // 上記以外の遷移はすべて不正
      throw new BadRequestException(`"${from}" から "${to}" へのステータス変更はできません`);
    }

    // ステータス遷移に応じて task_completions テーブルを操作する（FUN-TASK-008）
    if (from === 'pending' && to === 'reported') {
      // 実行報告: task_completions にレコードを作成する
      await this.tasksRepository.createTaskCompletion(taskId, user.sub, currentTask.reward_amount);
    } else if (from === 'reported' && to === 'completed') {
      // 承認: タスクの start_time 月の報酬が paid 済みの場合は承認を拒否する
      // paid 後に承認した task_completions は集計対象外になるため
      if (currentTask.assignee_id) {
        const base = currentTask.start_time ? new Date(currentTask.start_time) : new Date();
        const taskMonthJst = new Date(base.getTime() + 9 * 60 * 60 * 1000);
        const targetMonth = `${taskMonthJst.getUTCFullYear()}-${String(taskMonthJst.getUTCMonth() + 1).padStart(2, '0')}`;
        const existingReward = await this.rewardsRepository.findByChildAndMonth(
          currentTask.assignee_id,
          targetMonth,
        );
        if (existingReward?.status === 'paid') {
          throw new BadRequestException(
            `${targetMonth} の報酬は支払い済みのため、承認はできません。来月以降に実施してください`,
          );
        }
      }
      // task_completions の該当レコードに承認情報を設定する
      await this.tasksRepository.approveTaskCompletion(taskId, user.sub);
    } else if (from === 'reported' && to === 'pending') {
      // 差し戻し: task_completions の該当レコードをソフトデリートする
      await this.tasksRepository.cancelTaskCompletion(taskId);
    } else if (from === 'pending' && to === 'cancelled') {
      // 取り下げ（pending → cancelled）: task_completions の該当レコードをソフトデリートする
      // pending 状態の場合は完了記録が存在しないケースもあるため、エラーにしない
      await this.tasksRepository.cancelTaskCompletion(taskId);
    } else if (from === 'reported' && to === 'cancelled') {
      // 取り下げ（reported → cancelled）: task_completions の該当レコードをソフトデリートする
      await this.tasksRepository.cancelTaskCompletion(taskId);
    } else if (from === 'pending' && to === 'completed') {
      // 即時完了: assignee が設定されている場合、task_completions を作成して即時承認する
      // これにより報酬明細・合計金額の集計対象に含まれるようになる
      if (currentTask.assignee_id) {
        // タスクの start_time 月の報酬が paid 済みの場合は即時完了を拒否する（ADR-0004 参照）
        // paid 後に完了した task_completions は集計対象外になるため
        const base = currentTask.start_time ? new Date(currentTask.start_time) : new Date();
        const taskMonthJst = new Date(base.getTime() + 9 * 60 * 60 * 1000);
        const targetMonth = `${taskMonthJst.getUTCFullYear()}-${String(taskMonthJst.getUTCMonth() + 1).padStart(2, '0')}`;
        const existingReward = await this.rewardsRepository.findByChildAndMonth(
          currentTask.assignee_id,
          targetMonth,
        );
        if (existingReward?.status === 'paid') {
          throw new BadRequestException(
            `${targetMonth} の報酬は支払い済みのため、即時完了はできません。来月以降に実施してください`,
          );
        }
        await this.tasksRepository.createTaskCompletion(
          taskId,
          currentTask.assignee_id,
          currentTask.reward_amount,
        );
        await this.tasksRepository.approveTaskCompletion(taskId, user.sub);
      }
    }

    // バリデーション通過後にステータスを更新する
    const updated = await this.tasksRepository.updateTaskStatus(taskId, user.family_group_id, to);

    if (!updated) {
      throw new NotFoundException('タスクが見つかりません');
    }

    return updated;
  }

  /**
   * タスクIDで特定のタスク詳細を取得する（FUN-TASK-001）。
   * user.family_group_id でデータ分離フィルタを適用する。
   *
   * @param taskId - 取得対象のタスクID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns タスクオブジェクト
   * @throws NotFoundException タスクが存在しない、または他グループのタスクにアクセスした場合
   */
  async findById(taskId: string, user: JwtPayload): Promise<Task> {
    // group_id フィルタをリポジトリに渡すことで他グループのタスクへのアクセスを防ぐ
    const task = await this.tasksRepository.findById(taskId, user.family_group_id);

    if (!task) {
      throw new NotFoundException('タスクが見つかりません');
    }

    return task;
  }
}
