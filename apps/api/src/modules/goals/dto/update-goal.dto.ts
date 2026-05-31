import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 目標更新リクエスト DTO（FUN-GOAL-003 編集）。
 * openapi.yaml の GoalUpdateRequest スキーマに対応する。
 * 全フィールドがオプション。
 */
export class UpdateGoalDto {
  @ApiProperty({
    example: '今月は洗濯を15回する',
    description: '目標名',
    maxLength: 150,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  goalName?: string;

  @ApiProperty({
    example: 700,
    description: '目標達成ボーナス報酬金額（0以上の整数）',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  goalReward?: number;

  @ApiProperty({
    example: '2026-06',
    description: '対象月（YYYY-MM形式）',
    pattern: '^\\d{4}-\\d{2}$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'targetMonth は YYYY-MM 形式で指定してください' })
  targetMonth?: string;

  @ApiProperty({
    example: 'assignee-uuid-002',
    description: '担当者（子）のユーザーID（UUID形式の文字列）',
    format: 'uuid',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({
    example: 'task-uuid-002',
    description: '紐付けるタスクのID（UUID形式の文字列）',
    format: 'uuid',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    example: 15,
    description: '目標回数（定量目標の場合に指定）',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number;

  @ApiProperty({
    example: '毎日洗濯物をたたむ',
    description: '目標達成のための行動内容',
    maxLength: 255,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  action?: string;

  @ApiProperty({
    example: true,
    description: 'AND条件フラグ（true の場合、全条件を満たす必要がある）',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  andConditionFlag?: boolean;
}
