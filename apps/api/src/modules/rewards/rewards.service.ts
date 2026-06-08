import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Reward, TaskCompletion, JwtPayload } from '@fambiz/types';
import { RewardsRepository } from './rewards.repository';
import { EvaluationRequestDto } from './dto/evaluation-request.dto';
import { GetRewardQueryDto } from './dto/get-reward-query.dto';
import { GetRewardGraphQueryDto } from './dto/get-reward-graph-query.dto';
import { RewardGraphResponseDto, RewardGraphMonthDto } from './dto/reward-response.dto';

/**
 * 報酬管理のビジネスロジックを担当するサービス。
 */
@Injectable()
export class RewardsService {
  constructor(private readonly rewardsRepository: RewardsRepository) {}

  /**
   * 指定月の報酬を取得する（FUN-REWARD-001）。
   *
   * 報酬計算ロジック:
   * - rewards テーブルに child_id + target_month のレコードが存在しない場合: 計算して INSERT
   * - 存在して status = 'pending' の場合: 再計算して UPDATE
   * - 存在して status = 'paid' の場合: 既存レコードをそのまま返す（再計算しない）
   *
   * セキュリティチェック:
   * - groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー
   *
   * 端数処理: Math.floor（ADR-0004）
   * タイムゾーン: Asia/Tokyo (JST = UTC+9) で月範囲を計算（ADR-0004）
   *
   * @param query - クエリパラメータ（groupId, childId, targetMonth）
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 報酬オブジェクト
   */
  async getReward(query: GetRewardQueryDto, user: JwtPayload): Promise<Reward> {
    const { groupId, childId, targetMonth } = query;

    // 自分が所属するグループ以外の報酬参照を禁止する
    if (groupId !== user.family_group_id) {
      throw new ForbiddenException('他の家族グループの報酬は参照できません');
    }

    // 子ロールは自分自身の childId のみ参照可能（他の子の報酬への横断アクセスを禁止する）
    if (user.role === 'child' && childId !== user.sub) {
      throw new ForbiddenException('他のメンバーの報酬は参照できません');
    }

    // 既存の報酬レコードを検索する
    const existing = await this.rewardsRepository.findByChildAndMonth(childId, targetMonth);

    // 支払い済みの場合は再計算せずにそのまま返す
    if (existing && existing.status === 'paid') {
      return existing;
    }

    // タスク報酬合計とボーナス報酬合計を計算する（JST 月範囲・Math.floor 適用）
    const taskRewardTotal = await this.rewardsRepository.calcTaskRewardTotal(
      childId,
      groupId,
      targetMonth,
    );
    const bonusRewardTotal = await this.rewardsRepository.calcBonusRewardTotal(
      childId,
      groupId,
      targetMonth,
    );
    // 総報酬金額 = タスク報酬 + ボーナス報酬（端数は Math.floor で切り捨て）
    const totalAmount = Math.floor(taskRewardTotal + bonusRewardTotal);

    if (!existing) {
      // レコードが存在しない場合は新規 INSERT する
      return this.rewardsRepository.create(
        groupId,
        childId,
        targetMonth,
        taskRewardTotal,
        bonusRewardTotal,
        totalAmount,
      );
    }

    // status = 'pending' の場合は再計算して UPDATE する
    return this.rewardsRepository.updateAmounts(
      existing.id,
      taskRewardTotal,
      bonusRewardTotal,
      totalAmount,
    );
  }

  /**
   * 月次報酬グラフデータを取得する（FUN-REWARD-002）。
   *
   * historyMonths 分の月リストを生成し、各月の報酬データを返す。
   * 報酬レコードが存在しない月は 0 円として扱う。
   *
   * セキュリティチェック:
   * - groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー
   *
   * @param query - クエリパラメータ（groupId, childId, targetMonth, historyMonths）
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 月次報酬グラフデータ
   */
  async getRewardGraph(
    query: GetRewardGraphQueryDto,
    user: JwtPayload,
  ): Promise<RewardGraphResponseDto> {
    const { groupId, childId, targetMonth, historyMonths = 6 } = query;

    // 自分が所属するグループ以外の報酬参照を禁止する
    if (groupId !== user.family_group_id) {
      throw new ForbiddenException('他の家族グループの報酬は参照できません');
    }

    // 子ロールは自分自身の childId のみ参照可能（他の子の報酬への横断アクセスを禁止する）
    if (user.role === 'child' && childId !== user.sub) {
      throw new ForbiddenException('他のメンバーの報酬は参照できません');
    }

    // 対象月から遡って historyMonths 分の月リストを生成する（例: 6ヶ月分）
    const months = this.buildMonthList(targetMonth, historyMonths);

    // DB から対象期間の報酬データを一括取得する
    const rewards = await this.rewardsRepository.findByChildAndMonths(childId, groupId, months);

    // 月→報酬レコードのマップを作成する
    const rewardMap = new Map<string, Reward>(rewards.map((r) => [r.target_month, r]));

    // 全月分のグラフデータを構築する（DB にレコードがない月は 0 円）
    const monthsData: RewardGraphMonthDto[] = months.map((month) => {
      const reward = rewardMap.get(month);
      return {
        target_month: month,
        task_reward_total: reward?.task_reward_total ?? 0,
        bonus_reward_total: reward?.bonus_reward_total ?? 0,
        total_amount: reward?.total_amount ?? 0,
      };
    });

    return { months: monthsData };
  }

  /**
   * 報酬に評価スコアとコメントを登録する（FUN-REWARD-003・親のみ）。
   *
   * セキュリティチェック:
   * - @Roles('parent') をコントローラーで適用するため、子はアクセス不可
   * - リポジトリ側で group_id フィルタを適用するため、他グループへの操作は不可
   *
   * @param rewardId - 対象の報酬ID
   * @param dto - 評価リクエスト DTO（evaluationScore, evaluationComment）
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 更新された報酬オブジェクト
   * @throws NotFoundException 報酬が存在しない、または他グループの報酬にアクセスした場合
   */
  async registerEvaluation(
    rewardId: string,
    dto: EvaluationRequestDto,
    user: JwtPayload,
  ): Promise<Reward> {
    const updated = await this.rewardsRepository.updateEvaluation(
      rewardId,
      user.family_group_id,
      dto.evaluationScore,
      dto.evaluationComment,
    );

    if (!updated) {
      throw new NotFoundException('報酬が見つかりません');
    }

    return updated;
  }

  /**
   * 報酬を支払い済みにマークする（FUN-REWARD-004・親のみ）。
   *
   * ガードロジック:
   * - 既に paid の場合は BadRequestException をスロー（二重支払い防止）
   *
   * セキュリティチェック:
   * - @Roles('parent') をコントローラーで適用するため、子はアクセス不可
   * - リポジトリ側で group_id フィルタを適用するため、他グループへの操作は不可
   *
   * @param rewardId - 対象の報酬ID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 更新された報酬オブジェクト（status = 'paid', paid_at = now）
   * @throws NotFoundException 報酬が存在しない、または他グループの報酬にアクセスした場合
   * @throws BadRequestException 既に支払い済みの場合
   */
  async payReward(rewardId: string, user: JwtPayload): Promise<Reward> {
    // 現在のレコードを取得して二重支払いを検証する
    const current = await this.rewardsRepository.findById(rewardId, user.family_group_id);

    if (!current) {
      throw new NotFoundException('報酬が見つかりません');
    }

    // 既に paid の場合は二重支払いを防ぐためエラーを返す
    if (current.status === 'paid') {
      throw new BadRequestException('この報酬は既に支払い済みです');
    }

    const paidAt = new Date().toISOString();
    const updated = await this.rewardsRepository.markAsPaid(rewardId, user.family_group_id, paidAt);

    if (!updated) {
      throw new NotFoundException('報酬が見つかりません');
    }

    return updated;
  }

  /**
   * 指定した報酬に紐づくタスク完了履歴一覧を取得する（FUN-REWARD-005）。
   *
   * セキュリティチェック:
   * - rewardId で報酬を取得し、group_id でデータ分離を確認する
   * - 他グループの報酬は NotFoundException で返す（存在しないとして扱う）
   *
   * @param rewardId - 対象の報酬ID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns タスク完了履歴の配列
   * @throws NotFoundException 報酬が存在しない、または他グループの報酬にアクセスした場合
   */
  async getCompletions(rewardId: string, user: JwtPayload): Promise<TaskCompletion[]> {
    // 報酬レコードを取得して group_id でデータ分離を確認する
    const reward = await this.rewardsRepository.findById(rewardId, user.family_group_id);

    if (!reward) {
      throw new NotFoundException('報酬が見つかりません');
    }

    return this.rewardsRepository.findCompletionsByMonth(
      reward.child_id,
      user.family_group_id,
      reward.target_month,
    );
  }

  /**
   * 対象月から遡って指定月数分の月リストを生成する。
   * 例: targetMonth='2026-06', historyMonths=3 → ['2026-04', '2026-05', '2026-06']
   * @param targetMonth - 対象月（YYYY-MM形式）
   * @param historyMonths - 履歴月数
   * @returns 月リスト（YYYY-MM形式、昇順）
   */
  private buildMonthList(targetMonth: string, historyMonths: number): string[] {
    const [year, month] = targetMonth.split('-').map(Number);
    const months: string[] = [];

    for (let i = historyMonths - 1; i >= 0; i--) {
      // targetMonth を基準に i ヶ月前の月を計算する
      const d = new Date(Date.UTC(year, month - 1 - i, 1));
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
    }

    return months;
  }
}
