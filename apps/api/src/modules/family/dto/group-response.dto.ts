import { ApiProperty } from '@nestjs/swagger';
import type { Group } from '@fambiz/types';

/**
 * グループレスポンス DTO。
 * packages/types の Group 型に対応する。
 */
export class GroupResponseDto implements Group {
  @ApiProperty({ description: 'グループID（UUID）' })
  id: string;

  @ApiProperty({ description: 'グループ名' })
  group_name: string;

  @ApiProperty({ description: '招待コード（未設定の場合は null）', nullable: true })
  invite_code: string | null;

  @ApiProperty({ description: 'オーナーユーザーID（UUID）' })
  owner_id: string;

  @ApiProperty({ description: '作成日時（ISO 8601）' })
  created_at: string;

  @ApiProperty({ description: '更新日時（ISO 8601）' })
  updated_at: string;
}
