import { ApiProperty } from '@nestjs/swagger';

/**
 * 招待トークン発行レスポンス DTO（FUN-GROUP-004）。
 * QRコードに埋め込む招待トークンと有効期限を返す。
 */
export class InviteResponseDto {
  @ApiProperty({ description: '招待トークン' })
  inviteCode: string;

  @ApiProperty({ description: '有効期限（ISO 8601）', nullable: true })
  expiresAt: string | null;
}
