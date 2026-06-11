import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'parent@example.com', description: 'メールアドレス' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'パスワード（8文字以上）' })
  @IsString()
  @MinLength(8)
  password: string;
}
