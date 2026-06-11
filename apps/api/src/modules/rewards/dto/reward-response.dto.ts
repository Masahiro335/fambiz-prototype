import { ApiProperty } from '@nestjs/swagger';
import type { Reward, RewardStatus, User, UserRole } from '@fambiz/types';

/**
 * 報酬レスポンスに含まれる子ユーザー情報 DTO。
 * packages/types の User 型に対応する。
 */
export class UserInRewardDto implements User {
  @ApiProperty({ description: 'ユーザーID（UUID）' })
  id: string;

  @ApiProperty({ description: 'メールアドレス' })
  email: string;

  @ApiProperty({ description: '表示名' })
  name: string;

  @ApiProperty({ description: 'ロール（parent または child）', enum: ['parent', 'child'] })
  role: UserRole;

  @ApiProperty({ description: 'アバター画像URL（未設定の場合は null）', nullable: true })
  avatar_url: string | null;

  @ApiProperty({ description: 'コメント（未設定の場合は null）', nullable: true })
  comment: string | null;

  @ApiProperty({ description: '作成日時（ISO 8601）' })
  created_at: string;

  @ApiProperty({ description: '更新日時（ISO 8601）' })
  updated_at: string;
}

/**
 * 報酬レスポンス DTO。
 * packages/types の Reward 型に対応する。
 */
export class RewardResponseDto implements Reward {
  @ApiProperty({ description: '報酬ID（UUID）' })
  id: string;

  @ApiProperty({ description: '家族グループID（UUID）' })
  group_id: string;

  @ApiProperty({ description: '子ユーザーID（UUID）' })
  child_id: string;

  @ApiProperty({ description: '対象月（YYYY-MM形式）' })
  target_month: string;

  @ApiProperty({ description: 'タスク報酬合計金額' })
  task_reward_total: number;

  @ApiProperty({ description: 'ボーナス報酬合計金額' })
  bonus_reward_total: number;

  @ApiProperty({ description: '総報酬金額（task_reward_total + bonus_reward_total）' })
  total_amount: number;

  @ApiProperty({
    description: '評価スコア（1〜5）。未評価の場合は null。',
    nullable: true,
  })
  evaluation_score: number | null;

  @ApiProperty({
    description: '評価コメント（500文字以内）。未設定の場合は null。',
    nullable: true,
  })
  evaluation_comment: string | null;

  @ApiProperty({
    description: '報酬ステータス（pending または paid）',
    enum: ['pending', 'paid'],
  })
  status: RewardStatus;

  @ApiProperty({
    description: '支払い完了日時（ISO 8601）。未払いの場合は null。',
    nullable: true,
  })
  paid_at: string | null;

  @ApiProperty({ description: '作成日時（ISO 8601）' })
  created_at: string;

  @ApiProperty({ description: '更新日時（ISO 8601）' })
  updated_at: string;

  @ApiProperty({
    description: '子ユーザー情報',
    type: () => UserInRewardDto,
    required: false,
  })
  child?: UserInRewardDto;
}

/**
 * 報酬グラフの1ヶ月分データ DTO。
 */
export class RewardGraphMonthDto {
  @ApiProperty({ description: '対象月（YYYY-MM形式）' })
  target_month: string;

  @ApiProperty({ description: 'タスク報酬合計金額' })
  task_reward_total: number;

  @ApiProperty({ description: 'ボーナス報酬合計金額' })
  bonus_reward_total: number;

  @ApiProperty({ description: '総報酬金額' })
  total_amount: number;
}

/**
 * 報酬グラフレスポンス DTO。
 */
export class RewardGraphResponseDto {
  @ApiProperty({
    description: '月次報酬グラフデータ（対象月を含む直近 historyMonths ヶ月分）',
    type: [RewardGraphMonthDto],
  })
  months: RewardGraphMonthDto[];
}
