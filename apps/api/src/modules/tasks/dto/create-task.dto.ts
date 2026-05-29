import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * タスク作成リクエスト DTO。
 * openapi.yaml の TaskCreateRequest スキーマに対応する。
 */
export class CreateTaskDto {
  @ApiProperty({
    example: 'group-uuid-001',
    description: '家族グループID（UUID形式の文字列）',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  groupId: string;

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
    example: '食器洗い',
    description: 'タスク名',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  taskName: string;

  @ApiProperty({
    example: '家事',
    description: 'カテゴリ',
    maxLength: 50,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiProperty({
    example: 100,
    description: '報酬金額（0以上の整数）',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  rewardAmount: number;

  @ApiProperty({
    example: '2026-05-29T09:00:00Z',
    description: 'タスク開始時刻（ISO 8601）',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({
    example: '2026-05-29T10:00:00Z',
    description: 'タスク終了時刻（ISO 8601）',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({
    example: '2026-05-31T23:59:59Z',
    description: '期日（ISO 8601）',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    example: '夕食前までに終わらせてね',
    description: 'メモ',
    maxLength: 500,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}
