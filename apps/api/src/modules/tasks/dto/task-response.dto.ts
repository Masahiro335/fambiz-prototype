import { ApiProperty } from '@nestjs/swagger';
import type { Task, TaskCompletion, TaskStatus, User, UserRole } from '@fambiz/types';

/**
 * タスクに含まれるユーザー情報（作成者・担当者）の DTO。
 * packages/types の User 型に対応する。
 */
export class UserInTaskDto implements User {
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
 * タスクレスポンス DTO。
 * packages/types の Task 型に対応する。
 */
export class TaskResponseDto implements Task {
  @ApiProperty({ description: 'タスクID（UUID）' })
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

  @ApiProperty({ description: 'タスク名' })
  task_name: string;

  @ApiProperty({ description: 'カテゴリ（未設定の場合は null）', nullable: true })
  category: string | null;

  @ApiProperty({ description: '報酬金額' })
  reward_amount: number;

  @ApiProperty({
    description: 'タスクステータス',
    enum: ['pending', 'reported', 'completed', 'cancelled', 'expired'],
  })
  status: TaskStatus;

  @ApiProperty({ description: 'タスク開始時刻（ISO 8601）。未設定の場合は null。', nullable: true })
  start_time: string | null;

  @ApiProperty({ description: 'タスク終了時刻（ISO 8601）。未設定の場合は null。', nullable: true })
  end_time: string | null;

  @ApiProperty({ description: '期日（ISO 8601）。未設定の場合は null。', nullable: true })
  due_date: string | null;

  @ApiProperty({ description: 'メモ（未設定の場合は null）', nullable: true })
  memo: string | null;

  @ApiProperty({ description: '作成日時（ISO 8601）' })
  created_at: string;

  @ApiProperty({ description: '更新日時（ISO 8601）' })
  updated_at: string;

  @ApiProperty({
    description: '最新の実行報告情報（reported / completed 状態時に参照）。存在しない場合は null。',
    nullable: true,
    required: false,
  })
  latest_completion?: TaskCompletion | null;

  @ApiProperty({ description: '作成者ユーザー情報', type: () => UserInTaskDto, required: false })
  creator?: UserInTaskDto;

  @ApiProperty({ description: '担当者ユーザー情報', type: () => UserInTaskDto, required: false })
  assignee?: UserInTaskDto;
}
