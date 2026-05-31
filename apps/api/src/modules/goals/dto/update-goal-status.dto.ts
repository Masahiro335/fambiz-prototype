import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { GoalStatus } from '@fambiz/types';

/**
 * 目標ステータス変更リクエスト DTO（FUN-GOAL-005）。
 * openapi.yaml の GoalStatusUpdateRequest スキーマに対応する。
 */
export class UpdateGoalStatusDto {
  @ApiProperty({
    description: '変更後の目標ステータス',
    enum: ['not_started', 'in_progress', 'pending_approval', 'achieved', 'failed'],
  })
  @IsEnum(['not_started', 'in_progress', 'pending_approval', 'achieved', 'failed'])
  status: GoalStatus;
}
