import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * GET /v1/rewards クエリパラメータ DTO。
 * 指定月の報酬集計を取得するために使用する。
 */
export class GetRewardQueryDto {
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
}
