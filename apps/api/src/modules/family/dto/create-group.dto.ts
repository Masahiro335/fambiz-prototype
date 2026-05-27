import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * グループ作成リクエスト DTO。
 * openapi.yaml の GroupCreateRequest スキーマに対応する。
 */
export class CreateGroupDto {
  @ApiProperty({
    example: '山田家',
    description: 'グループ名',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  groupName: string;
}
