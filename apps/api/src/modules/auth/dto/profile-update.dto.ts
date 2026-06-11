import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileUpdateDto {
  @ApiPropertyOptional({ example: '山田太郎', description: 'ユーザー名' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'アバターURL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'よろしくお願いします', description: '一言コメント' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;
}
