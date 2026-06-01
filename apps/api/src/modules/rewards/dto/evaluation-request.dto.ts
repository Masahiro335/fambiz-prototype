import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * POST /v1/rewards/:rewardId/evaluation リクエスト DTO。
 * 親が子の月次報酬に対して評価スコアとコメントを登録する。
 */
export class EvaluationRequestDto {
  @ApiProperty({
    example: 4,
    description: '評価スコア（1〜5の整数）',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  evaluationScore: number;

  @ApiProperty({
    example: '今月はよく頑張りました！',
    description: '評価コメント（500文字以内・任意）',
    maxLength: 500,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evaluationComment?: string;
}
