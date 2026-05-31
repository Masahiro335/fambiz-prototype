import { ApiProperty } from '@nestjs/swagger';
import type { Goal, GoalStatus, User, UserRole } from '@fambiz/types';

/**
 * 目標レスポンスに含まれるユーザー情報 DTO。
 * packages/types の User 型に対応する。
 */
export class UserInGoalDto implements User {
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
 * 目標レスポンス DTO。
 * packages/types の Goal 型に対応する。
 */
export class GoalResponseDto implements Goal {
  @ApiProperty({ description: '目標ID（UUID）' })
  id: string;

  @ApiProperty({ description: '家族グループID（UUID）' })
  group_id: string;

  @ApiProperty({ description: '作成者ユーザーID（UUID）' })
  creator_id: string;

  @ApiProperty({
    description: '担当者ユーザーID（UUID）。未割り当ての場合は null。',
    nullable: true,
  })
  assignee_id: string | null;

  @ApiProperty({
    description: '紐付けるタスクID（UUID）。紐付けなしの場合は null。',
    nullable: true,
  })
  task_id: string | null;

  @ApiProperty({ description: '目標名' })
  goal_name: string;

  @ApiProperty({ description: '目標達成ボーナス報酬金額' })
  goal_reward: number;

  @ApiProperty({
    description: '目標回数（定量目標の場合）。定性目標の場合は null。',
    nullable: true,
  })
  target_count: number | null;

  @ApiProperty({ description: '目標達成のための行動内容（未設定の場合は null）', nullable: true })
  action: string | null;

  @ApiProperty({ description: 'AND条件フラグ（true の場合、全条件を満たす必要がある）' })
  and_condition_flag: boolean;

  @ApiProperty({
    description: '目標ステータス',
    enum: ['not_started', 'in_progress', 'pending_approval', 'achieved', 'failed'],
  })
  status: GoalStatus;

  @ApiProperty({ description: '対象月（YYYY-MM形式）' })
  target_month: string;

  @ApiProperty({ description: '作成日時（ISO 8601）' })
  created_at: string;

  @ApiProperty({ description: '更新日時（ISO 8601）' })
  updated_at: string;

  @ApiProperty({ description: '作成者ユーザー情報', type: () => UserInGoalDto, required: false })
  creator?: UserInGoalDto;

  @ApiProperty({ description: '担当者ユーザー情報', type: () => UserInGoalDto, required: false })
  assignee?: UserInGoalDto;
}
