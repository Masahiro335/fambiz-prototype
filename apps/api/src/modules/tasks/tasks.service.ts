import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Task, TaskStatus, JwtPayload } from '@fambiz/types';
import { TasksRepository } from './tasks.repository';
import { CreateTaskDto } from './dto/create-task.dto';

/**
 * タスク管理のビジネスロジックを担当するサービス。
 */
@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

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
   * @returns タスクの配列
   */
  async findAll(
    groupId: string,
    user: JwtPayload,
    status?: TaskStatus,
    assigneeId?: string,
    keyword?: string,
  ): Promise<Task[]> {
    // 自分が所属するグループ以外のタスク参照を禁止する
    if (groupId !== user.family_group_id) {
      throw new ForbiddenException('他の家族グループのタスクは参照できません');
    }

    return this.tasksRepository.findAll({ groupId, status, assigneeId, keyword });
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
