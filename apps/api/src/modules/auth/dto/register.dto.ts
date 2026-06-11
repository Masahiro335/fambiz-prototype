import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { UserRole } from '@fambiz/types';

export class RegisterDto {
  @ApiProperty({ example: 'parent@example.com', description: 'メールアドレス' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'パスワード（8文字以上）' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '山田太郎', description: 'ユーザー名' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['parent', 'child'], description: 'ユーザーロール' })
  @IsEnum(['parent', 'child'] as UserRole[])
  role: UserRole;
}
