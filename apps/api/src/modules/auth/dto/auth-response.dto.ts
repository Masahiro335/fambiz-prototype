import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@fambiz/types';

export class AuthResponseDto {
  @ApiProperty({ description: 'Supabase発行のアクセストークン（JWT）' })
  accessToken: string;

  @ApiProperty({ description: 'セッション更新用リフレッシュトークン' })
  refreshToken: string;

  @ApiProperty({ description: 'ログイン済みユーザー情報' })
  user: User;
}
