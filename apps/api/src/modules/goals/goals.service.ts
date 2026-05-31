import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Goal, GoalStatus, JwtPayload } from '@fambiz/types';
import { GoalsRepository } from './goals.repository';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateGoalStatusDto } from './dto/update-goal-status.dto';

/**
 * 目標管理のビジネスロジックを担当するサービス。
 */
@Injectable()
export class GoalsService {
  constructor(private readonly goalsRepository: GoalsRepository) {}

  /**
   * 目標一覧を取得する（FUN-GOAL-001）。
   *
   * セキュリティチェック:
   * - リクエストの groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー
   * - 他家族グループの目標一覧参照を絶対に許容しない（業務ルール必須）
   *
   * @param groupId - 取得対象のグループID（クエリパラメータ）
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @param targetMonth - 対象月フィルタ（YYYY-MM形式・任意）
   * @returns 目標の配列
   */
  async findAll(groupId: string, user: JwtPayload, targetMonth?: string): Promise<Goal[]> {
    // 自分が所属するグループ以外の目標参照を禁止する
    if (groupId !== user.family_group_id) {
      throw new ForbiddenException('他の家族グループの目標は参照できません');
    }

    return this.goalsRepository.findAll(groupId, targetMonth);
  }

  /**
   * 目標IDで特定の目標詳細を取得する（FUN-GOAL-002）。
   * user.family_group_id でデータ分離フィルタを適用する。
   *
   * @param goalId - 取得対象の目標ID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 目標オブジェクト
   * @throws NotFoundException 目標が存在しない、または他グループの目標にアクセスした場合
   */
  async findById(goalId: string, user: JwtPayload): Promise<Goal> {
    // group_id フィルタをリポジトリに渡すことで他グループの目標へのアクセスを防ぐ
    const goal = await this.goalsRepository.findById(goalId, user.family_group_id);

    if (!goal) {
      throw new NotFoundException('目標が見つかりません');
    }

    return goal;
  }

  /**
   * 新しい目標を作成する（FUN-GOAL-003・親のみ）。
   *
   * セキュリティチェック:
   * - リクエストの groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー
   * - 他家族グループへの目標作成を絶対に許容しない（業務ルール必須）
   *
   * @param dto - 目標作成リクエスト DTO
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 作成された目標オブジェクト
   */
  async createGoal(dto: CreateGoalDto, user: JwtPayload): Promise<Goal> {
    // 自分が所属するグループ以外への目標作成を禁止する
    if (dto.groupId !== user.family_group_id) {
      throw new ForbiddenException('他の家族グループに目標を作成することはできません');
    }

    return this.goalsRepository.create(
      dto.groupId,
      user.sub,
      dto.goalName,
      dto.goalReward,
      dto.targetMonth,
      dto.assigneeId,
      dto.taskId,
      dto.targetCount,
      dto.action,
      dto.andConditionFlag,
    );
  }

  /**
   * 既存目標を更新する（FUN-GOAL-003 編集・親のみ）。
   *
   * セキュリティチェック:
   * - リポジトリ側で group_id フィルタを適用するため、他グループへの更新は不可
   * - 更新結果が null の場合は対象目標が存在しないとして NotFoundException をスロー
   *
   * @param goalId - 更新対象の目標ID
   * @param dto - 目標更新リクエスト DTO（全フィールドオプション）
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 更新された目標オブジェクト
   * @throws NotFoundException 目標が存在しない、または他グループの目標にアクセスした場合
   */
  async updateGoal(goalId: string, dto: UpdateGoalDto, user: JwtPayload): Promise<Goal> {
    // DTOのキャメルケースをDBのスネークケースに変換して渡す
    const updated = await this.goalsRepository.update(goalId, user.family_group_id, {
      goal_name: dto.goalName,
      goal_reward: dto.goalReward,
      target_month: dto.targetMonth,
      assignee_id: dto.assigneeId,
      task_id: dto.taskId,
      target_count: dto.targetCount,
      action: dto.action,
      and_condition_flag: dto.andConditionFlag,
    });

    if (!updated) {
      throw new NotFoundException('目標が見つかりません');
    }

    return updated;
  }

  /**
   * 目標をソフトデリートする（FUN-GOAL-004・親のみ）。
   *
   * セキュリティチェック:
   * - リポジトリ側で group_id フィルタを適用するため、他グループの目標への削除は不可
   * - 削除結果が false の場合は対象目標が存在しないとして NotFoundException をスロー
   *
   * @param goalId - 削除対象の目標ID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 削除完了メッセージ
   * @throws NotFoundException 目標が存在しない、または他グループの目標にアクセスした場合
   */
  async deleteGoal(goalId: string, user: JwtPayload): Promise<{ message: string }> {
    const deleted = await this.goalsRepository.delete(goalId, user.family_group_id);

    if (!deleted) {
      throw new NotFoundException('目標が見つかりません');
    }

    return { message: '目標を削除しました' };
  }

  /**
   * 目標のステータスを変更する（FUN-GOAL-005）。
   *
   * ステータス遷移ルール:
   * - not_started → in_progress       : 子（child）のみ可（挑戦宣言）
   * - in_progress → pending_approval  : 子（child）のみ可（達成申請）
   * - pending_approval → achieved     : 親（parent）のみ可（達成承認）
   * - pending_approval → failed       : 親（parent）のみ可（未達成判定）
   * - pending_approval → in_progress  : 親（parent）のみ可（差し戻し）
   * - achieved / failed からの遷移    : 全ロール不可（終端ステータス）
   *
   * セキュリティチェック:
   * - リポジトリ側で group_id フィルタを適用するため、他グループへの操作は不可
   * - ステータス遷移のロール違反は ForbiddenException をスロー
   * - 不正遷移は BadRequestException をスロー
   *
   * @param goalId - 更新対象の目標ID
   * @param dto - ステータス変更リクエスト DTO
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 更新された目標オブジェクト
   * @throws NotFoundException 目標が存在しない、または他グループの目標にアクセスした場合
   * @throws ForbiddenException ロールに許可されていない遷移を試みた場合
   * @throws BadRequestException 不正なステータス遷移の場合
   */
  async updateGoalStatus(
    goalId: string,
    dto: UpdateGoalStatusDto,
    user: JwtPayload,
  ): Promise<Goal> {
    // 現在の目標を取得してステータスを確認する（group_id フィルタで他グループ分離も兼ねる）
    const currentGoal = await this.goalsRepository.findById(goalId, user.family_group_id);

    if (!currentGoal) {
      throw new NotFoundException('目標が見つかりません');
    }

    const from: GoalStatus = currentGoal.status;
    const to: GoalStatus = dto.status;
    const role = user.role;

    // 終端ステータスからの遷移は全ロールに対して不可
    if (from === 'achieved' || from === 'failed') {
      throw new BadRequestException(`ステータス "${from}" の目標は変更できません`);
    }

    // ステータス遷移のロール・組み合わせを検証する
    if (from === 'not_started' && to === 'in_progress') {
      // 挑戦宣言: 子のみ可
      if (role !== 'child') {
        throw new ForbiddenException('挑戦宣言は子のみ行えます');
      }
    } else if (from === 'in_progress' && to === 'pending_approval') {
      // 達成申請: 子のみ可
      if (role !== 'child') {
        throw new ForbiddenException('達成申請は子のみ行えます');
      }
    } else if (from === 'pending_approval' && to === 'achieved') {
      // 達成承認: 親のみ可
      if (role !== 'parent') {
        throw new ForbiddenException('達成承認は親のみ行えます');
      }
    } else if (from === 'pending_approval' && to === 'failed') {
      // 未達成判定: 親のみ可
      if (role !== 'parent') {
        throw new ForbiddenException('未達成判定は親のみ行えます');
      }
    } else if (from === 'pending_approval' && to === 'in_progress') {
      // 差し戻し: 親のみ可
      if (role !== 'parent') {
        throw new ForbiddenException('差し戻しは親のみ行えます');
      }
    } else {
      // 上記以外の遷移はすべて不正
      throw new BadRequestException(`"${from}" から "${to}" へのステータス変更はできません`);
    }

    // バリデーション通過後にステータスを更新する
    const updated = await this.goalsRepository.updateStatus(goalId, user.family_group_id, to);

    if (!updated) {
      throw new NotFoundException('目標が見つかりません');
    }

    return updated;
  }
}
