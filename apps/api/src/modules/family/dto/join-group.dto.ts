import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * グループ参加リクエスト DTO。
 * openapi.yaml の GroupJoinRequest スキーマに対応する。
 */
export class JoinGroupDto {
  @ApiProperty({ description: '招待トークン' })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
