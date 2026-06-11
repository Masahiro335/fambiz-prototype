import { ApiProperty } from '@nestjs/swagger';

/**
 * グループ参加プレビューレスポンス DTO。
 * 招待コードの有効性確認と参加前のグループ情報表示に使用する。
 * RLS バイパスのため NestJS（service_role）経由でのみ取得可能。
 */
export class GroupPreviewResponseDto {
  @ApiProperty({ description: 'グループ名' })
  groupName: string;

  @ApiProperty({ description: '現在のメンバー数' })
  memberCount: number;
}
