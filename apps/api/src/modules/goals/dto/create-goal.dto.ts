import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 目標作成リクエスト DTO。
 * openapi.yaml の GoalCreateRequest スキーマに対応する。
 */
export class CreateGoalDto {
  @ApiProperty({
    example: 'group-uuid-001',
    description: '家族グループID（UUID形式の文字列）',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({
    example: '今月は皿洗いを10回する',
    description: '目標名',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  goalName: string;

  @ApiProperty({
    example: 500,
    description: '目標達成ボーナス報酬金額（0以上の整数）',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  goalReward: number;

  @ApiProperty({
    example: '2026-05',
    description: '対象月（YYYY-MM形式）',
    pattern: '^\\d{4}-\\d{2}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'targetMonth は YYYY-MM 形式で指定してください' })
  targetMonth: string;

  @ApiProperty({
    example: 'assignee-uuid-001',
    description: '担当者（子）のユーザーID（UUID形式の文字列）。省略時は未割り当て。',
    format: 'uuid',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({
    example: 'task-uuid-001',
    description: '紐付けるタスクのID（UUID形式の文字列）。省略時は null。',
    format: 'uuid',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    example: 10,
    description: '目標回数（定量目標の場合に指定）。省略時は定性目標。',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number;

  @ApiProperty({
    example: '皿洗いを毎日行う',
    description: '目標達成のための行動内容（任意）',
    maxLength: 255,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  action?: string;

  @ApiProperty({
    example: false,
    description: 'AND条件フラグ（true の場合、全条件を満たす必要がある）',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  andConditionFlag?: boolean;
}
