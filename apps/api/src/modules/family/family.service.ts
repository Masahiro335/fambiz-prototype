import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Group, GroupMember, JwtPayload } from '@fambiz/types';
import { FamilyRepository } from './family.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { InviteResponseDto } from './dto/invite-response.dto';

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

  /**
   * 家族グループの特定メンバーを1件取得する。
   *
   * セキュリティチェック:
   * - リクエストユーザーの family_group_id と指定した groupId が一致しない場合は ForbiddenException をスロー
   * - 他家族グループへのアクセスを絶対に許容しない（業務ルール必須）
   *
   * @param groupId - 取得対象のグループID
   * @param userId - 取得対象のユーザーID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns グループメンバー（ユーザー情報を含む）
   */
  async findGroupMember(groupId: string, userId: string, user: JwtPayload): Promise<GroupMember> {
    // 自分が所属するグループ以外へのアクセスを禁止する
    if (user.family_group_id !== groupId) {
      throw new ForbiddenException('他の家族グループのメンバーは参照できません');
    }

    const member = await this.familyRepository.findGroupMemberById(groupId, userId);
    if (!member) {
      throw new NotFoundException('メンバーが見つかりません');
    }

    return member;
  }

  /**
   * 家族グループの招待トークンを生成して保存する（FUN-GROUP-004）。
   * 親のみ実行可能。リクエストユーザーが対象グループに所属していない場合は ForbiddenException をスロー。
   *
   * @param groupId - 招待対象のグループID
   * @param user - JWTペイロード（認証済みユーザー情報）
   * @returns 招待トークンと有効期限（現在時刻 + 24時間）
   */
  async generateInviteCode(groupId: string, user: JwtPayload): Promise<InviteResponseDto> {
    // 自分が所属するグループ以外への操作を禁止する
    if (user.family_group_id !== groupId) {
      throw new ForbiddenException('他の家族グループは操作できません');
    }

    // Node.js 組み込み crypto でランダムなトークンを生成する
    const inviteCode = randomBytes(32).toString('hex');

    // 生成したトークンをDBに保存する
    await this.familyRepository.saveInviteCode(groupId, inviteCode);

    // 有効期限は現在時刻 + 24時間
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return { inviteCode, expiresAt };
  }
}
