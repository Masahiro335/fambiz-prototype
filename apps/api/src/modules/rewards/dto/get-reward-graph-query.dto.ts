import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * GET /v1/rewards/graph クエリパラメータ DTO。
 * 月次報酬グラフデータを取得するために使用する。
 */
export class GetRewardGraphQueryDto {
  @ApiProperty({
    example: 'group-uuid-001',
    description: '家族グループID（UUID形式の文字列）',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({
    example: 'child-uuid-001',
    description: '子ユーザーID（UUID形式の文字列）',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  childId: string;

  @ApiProperty({
    example: '2026-06',
    description: '対象月（YYYY-MM形式）',
    pattern: '^\\d{4}-\\d{2}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'targetMonth は YYYY-MM 形式で指定してください' })
  targetMonth: string;

  @ApiProperty({
    example: 6,
    description: '履歴表示月数（デフォルト6、最大12）',
    minimum: 1,
    maximum: 12,
    required: false,
    default: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  historyMonths?: number = 6;
}
