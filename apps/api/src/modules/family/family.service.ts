import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Group, GroupMember, JwtPayload } from '@fambiz/types';
import { FamilyRepository } from './family.repository';
import { CreateGroupDto } from './dto/create-group.dto';

/**
 * 家族グループのビジネスロジックを担当するサービス。
 */
@Injectable()
export class FamilyService {
  constructor(private readonly familyRepository: FamilyRepository) {}

  /**
   * 家族グループを作成する。
   *
   * 処理順序:
   * 1. 同一 owner_id のグループが既に存在する場合は BadRequestException をスロー
   * 2. family_groups テーブルにグループを INSERT
   * 3. group_members テーブルにオーナーをメンバーとして INSERT
   * 4. users テーブルの family_group_id を更新
   *
   * @param dto - グループ作成リクエスト DTO
   * @param ownerId - 作成者（親）のユーザーID
   * @returns 作成されたグループオブジェクト
   */
  async createGroup(dto: CreateGroupDto, ownerId: string): Promise<Group> {
    // 既存グループの重複チェック（同一親は1グループのみ作成可能）
    const existingGroup = await this.familyRepository.findGroupByOwnerId(ownerId);
    if (existingGroup) {
      throw new BadRequestException('このユーザーは既に家族グループを作成しています');
    }

    // グループを作成
    const group = await this.familyRepository.createGroup(dto.groupName, ownerId);

    // オーナーをグループメンバーに追加
    await this.familyRepository.addGroupMember(group.id, ownerId);

    // ユーザーの family_group_id を更新
    await this.familyRepository.updateUserFamilyGroupId(ownerId, group.id);

    return group;
  }

  /**
   * 家族グループのメンバー一覧を取得する。
   *
   * セキュリティチェック:
   * - リクエストユーザーの family_group_id と指定した groupId が一致しない場合は ForbiddenException をスロー
   * - 他家族グループへのアクセスを絶対に許容しない（業務ルール必須）
   *
   * @param groupId - 取得対象のグループID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns グループメンバーの配列（参加日時昇順）
   */
  async findGroupMembers(groupId: string, user: JwtPayload): Promise<GroupMember[]> {
    // 自分が所属するグループ以外へのアクセスを禁止する
    if (user.family_group_id !== groupId) {
      throw new ForbiddenException('他の家族グループのメンバーは参照できません');
    }

    return this.familyRepository.findGroupMembers(groupId);
  }
}
