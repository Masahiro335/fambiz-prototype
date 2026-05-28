import { ApiProperty } from '@nestjs/swagger';
import type { GroupMember, User, UserRole } from '@fambiz/types';

/**
 * グループメンバーに含まれるユーザー情報の DTO。
 * packages/types の User 型に対応する。
 */
export class UserInGroupDto implements User {
  @ApiProperty({ description: 'ユーザーID（UUID）' })
  id: string;

  @ApiProperty({ description: 'メールアドレス' })
  email: string;

  @ApiProperty({ description: '表示名' })
  name: string;

  @ApiProperty({ description: 'ロール（parent または child）', enum: ['parent', 'child'] })
  role: UserRole;

  @ApiProperty({ description: 'アバター画像URL（未設定の場合は null）', nullable: true })
  avatar_url: string | null;

  @ApiProperty({ description: 'コメント（未設定の場合は null）', nullable: true })
  comment: string | null;

  @ApiProperty({ description: '作成日時（ISO 8601）' })
  created_at: string;

  @ApiProperty({ description: '更新日時（ISO 8601）' })
  updated_at: string;
}

/**
 * グループメンバー一覧レスポンス DTO。
 * packages/types の GroupMember 型に対応する（OpenAPI: GroupMember スキーマ）。
 */
export class GroupMemberResponseDto implements GroupMember {
  @ApiProperty({ description: 'グループメンバーID（UUID）' })
  id: string;

  @ApiProperty({ description: 'グループID（UUID）' })
  group_id: string;

  @ApiProperty({ description: 'ユーザーID（UUID）' })
  user_id: string;

  @ApiProperty({ description: '参加日時（ISO 8601）' })
  joined_at: string;

  @ApiProperty({ description: 'ユーザー情報', type: () => UserInGroupDto })
  user?: UserInGroupDto;
}
