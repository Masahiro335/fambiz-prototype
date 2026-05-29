import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { TaskStatus } from '@fambiz/types';

/**
 * タスクステータス変更リクエスト DTO（FUN-TASK-004）。
 * openapi.yaml の TaskStatusUpdateRequest スキーマに対応する。
 */
export class UpdateTaskStatusDto {
  @ApiProperty({
    description: '変更後のタスクステータス',
    enum: ['pending', 'reported', 'completed', 'cancelled', 'expired'],
  })
  @IsEnum(['pending', 'reported', 'completed', 'cancelled', 'expired'])
  status: TaskStatus;

  @ApiProperty({
    example: '作業が不完全です。やり直してください。',
    description: 'コメント（差し戻し理由など）。任意。',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
