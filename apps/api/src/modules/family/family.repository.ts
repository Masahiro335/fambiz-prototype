import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
  type WebSocketLikeConstructor,
} from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { Group, GroupMember } from '@fambiz/types';

/**
 * 家族グループのデータアクセスを担当するリポジトリ。
 * Supabase（service_role）を使って family_groups / group_members / users テーブルを操作する。
 */
@Injectable()
export class FamilyRepository {
  /**
   * DBクエリ専用クライアント（service_role、RLSバイパス）。
   */
  private readonly db: SupabaseClient<any>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    // ws パッケージの WebSocket を Supabase が要求する型に変換（Node.js 20 対応）
    const opts: SupabaseClientOptions<'public'> = {
      realtime: { transport: WebSocket as unknown as WebSocketLikeConstructor },
    };
    this.db = createClient<any, 'public'>(url, serviceRoleKey, opts);
  }

  /**
   * 指定した owner_id のグループが既に存在するか確認する。
   * @param ownerId - 親ユーザーのID
   * @returns グループが存在する場合は Group オブジェクト、存在しない場合は null
   */
  async findGroupByOwnerId(ownerId: string): Promise<Group | null> {
    const { data, error } = await this.db
      .from('groups')
      .select('id, group_name, invite_code, owner_id, created_at, updated_at')
      .eq('owner_id', ownerId)
      .eq('deleted_flag', false)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('グループの検索に失敗しました');
    }

    return data ?? null;
  }

  /**
   * 新しい家族グループを作成する。
   * @param groupName - グループ名
   * @param ownerId - オーナー（親）のユーザーID
   * @returns 作成されたグループオブジェクト
   */
  async createGroup(groupName: string, ownerId: string): Promise<Group> {
    const { data, error } = await this.db
      .from('groups')
      .insert({
        group_name: groupName,
        owner_id: ownerId,
      })
      .select('id, group_name, invite_code, owner_id, created_at, updated_at')
      .single();

    if (error || !data) {
      throw new InternalServerErrorException('グループの作成に失敗しました');
    }

    return data;
  }

  /**
   * グループメンバーテーブルにオーナーをメンバーとして追加する。
   * @param groupId - グループID
   * @param userId - ユーザーID（オーナー）
   */
  async addGroupMember(groupId: string, userId: string): Promise<void> {
    const { error } = await this.db.from('group_members').insert({
      group_id: groupId,
      user_id: userId,
    });

    if (error) {
      throw new InternalServerErrorException('グループメンバーの追加に失敗しました');
    }
  }

  /**
   * 指定したグループに所属するメンバー一覧を取得する。
   * users テーブルを JOIN してユーザー情報も含めて返す。
   * @param groupId - グループID
   * @returns グループメンバーの配列（参加日時昇順）
   */
  async findGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await this.db
      .from('group_members')
      .select(
        'id, group_id, user_id, joined_at, user:users(id, email, name, role, avatar_url, comment, created_at, updated_at)',
      )
      .eq('group_id', groupId)
      .eq('deleted_flag', false)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('グループメンバーの取得に失敗しました');
    }

    return (data ?? []) as unknown as GroupMember[];
  }

  /**
   * 指定したグループに所属する特定メンバーを1件取得する。
   * users テーブルを JOIN してユーザー情報も含めて返す。
   * @param groupId - グループID
   * @param userId - ユーザーID
   * @returns グループメンバー（存在しない場合は null）
   */
  async findGroupMemberById(groupId: string, userId: string): Promise<GroupMember | null> {
    const { data, error } = await this.db
      .from('group_members')
      .select(
        'id, group_id, user_id, joined_at, user:users(id, email, name, role, avatar_url, comment, created_at, updated_at)',
      )
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('deleted_flag', false)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('グループメンバーの取得に失敗しました');
    }

    return (data ?? null) as unknown as GroupMember | null;
  }

  /**
   * グループの招待コードを更新する（FUN-GROUP-004）。
   * groups テーブルの invite_code カラムを指定した inviteCode で UPDATE する。
   * @param groupId - 更新対象のグループID
   * @param inviteCode - 生成した招待トークン文字列
   */
  async saveInviteCode(groupId: string, inviteCode: string): Promise<void> {
    const { error } = await this.db
      .from('groups')
      .update({ invite_code: inviteCode })
      .eq('id', groupId)
      .eq('deleted_flag', false);

    if (error) {
      throw new InternalServerErrorException('招待コードの保存に失敗しました');
    }
  }

  /**
   * users テーブルの family_group_id を更新する。
   * ※ users テーブルには family_group_id カラムが存在しないため、
   *    group_members への INSERT のみで JWT カスタムクレームフック（custom_access_token_hook）が
   *    group_members から family_group_id を取得する設計となっている。
   *    このメソッドは将来の拡張用に残しておく。
   * @param _userId - 更新対象のユーザーID（現在は未使用）
   * @param _familyGroupId - 紐付けるグループID（現在は未使用）
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateUserFamilyGroupId(_userId: string, _familyGroupId: string): Promise<void> {
    // group_members テーブルへの INSERT で JWT カスタムクレームが更新されるため処理不要
    // （custom_access_token_hook が group_members から family_group_id を参照する）
  }
}
