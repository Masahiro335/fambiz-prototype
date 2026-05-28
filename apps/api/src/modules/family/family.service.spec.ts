import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyRepository } from './family.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import type { Group, GroupMember, JwtPayload } from '@fambiz/types';

// =========================================================================
// FamilyRepository のモック
// =========================================================================

const mockFamilyRepository = {
  findGroupByOwnerId: jest.fn(),
  createGroup: jest.fn(),
  addGroupMember: jest.fn(),
  updateUserFamilyGroupId: jest.fn(),
  findGroupMembers: jest.fn(),
  findGroupMemberById: jest.fn(),
};

// =========================================================================
// テスト本体
// =========================================================================

describe('FamilyService', () => {
  let service: FamilyService;

  // テスト用グループデータ
  const mockGroup: Group = {
    id: 'group-id-001',
    group_name: '山田家',
    invite_code: null,
    owner_id: 'owner-user-id',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const ownerId = 'owner-user-id';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        {
          provide: FamilyRepository,
          useValue: mockFamilyRepository,
        },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);

    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  it('サービスが正常に生成されること', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createGroup
  // =========================================================================

  describe('createGroup', () => {
    const createGroupDto: CreateGroupDto = {
      groupName: '山田家',
    };

    it('正常にグループを作成できること', async () => {
      // グループが存在しない
      mockFamilyRepository.findGroupByOwnerId.mockResolvedValue(null);
      // グループ作成に成功
      mockFamilyRepository.createGroup.mockResolvedValue(mockGroup);
      // メンバー追加に成功
      mockFamilyRepository.addGroupMember.mockResolvedValue(undefined);
      // ユーザー更新に成功
      mockFamilyRepository.updateUserFamilyGroupId.mockResolvedValue(undefined);

      const result = await service.createGroup(createGroupDto, ownerId);

      expect(result).toEqual(mockGroup);
      // グループ作成が正しい引数で呼ばれること
      expect(mockFamilyRepository.createGroup).toHaveBeenCalledWith(
        createGroupDto.groupName,
        ownerId,
      );
      // オーナーがメンバーとして追加されること
      expect(mockFamilyRepository.addGroupMember).toHaveBeenCalledWith(mockGroup.id, ownerId);
      // ユーザーの family_group_id が更新されること
      expect(mockFamilyRepository.updateUserFamilyGroupId).toHaveBeenCalledWith(
        ownerId,
        mockGroup.id,
      );
    });

    it('既にグループを持つ親が作成しようとした場合は BadRequestException をスロー', async () => {
      // 既存グループが存在する
      mockFamilyRepository.findGroupByOwnerId.mockResolvedValue(mockGroup);

      await expect(service.createGroup(createGroupDto, ownerId)).rejects.toThrow(
        BadRequestException,
      );

      // グループ作成・メンバー追加・ユーザー更新は呼ばれないこと
      expect(mockFamilyRepository.createGroup).not.toHaveBeenCalled();
      expect(mockFamilyRepository.addGroupMember).not.toHaveBeenCalled();
      expect(mockFamilyRepository.updateUserFamilyGroupId).not.toHaveBeenCalled();
    });

    it('グループ作成後にメンバー追加が実行されること', async () => {
      mockFamilyRepository.findGroupByOwnerId.mockResolvedValue(null);
      mockFamilyRepository.createGroup.mockResolvedValue(mockGroup);
      mockFamilyRepository.addGroupMember.mockResolvedValue(undefined);
      mockFamilyRepository.updateUserFamilyGroupId.mockResolvedValue(undefined);

      await service.createGroup(createGroupDto, ownerId);

      // 実行順序の確認: createGroup → addGroupMember → updateUserFamilyGroupId
      const createOrder = mockFamilyRepository.createGroup.mock.invocationCallOrder[0];
      const addMemberOrder = mockFamilyRepository.addGroupMember.mock.invocationCallOrder[0];
      const updateUserOrder =
        mockFamilyRepository.updateUserFamilyGroupId.mock.invocationCallOrder[0];

      expect(createOrder).toBeLessThan(addMemberOrder);
      expect(addMemberOrder).toBeLessThan(updateUserOrder);
    });

    it('グループ作成が失敗した場合はエラーが伝播すること', async () => {
      mockFamilyRepository.findGroupByOwnerId.mockResolvedValue(null);
      mockFamilyRepository.createGroup.mockRejectedValue(new Error('グループの作成に失敗しました'));

      await expect(service.createGroup(createGroupDto, ownerId)).rejects.toThrow(
        'グループの作成に失敗しました',
      );

      // メンバー追加・ユーザー更新は呼ばれないこと
      expect(mockFamilyRepository.addGroupMember).not.toHaveBeenCalled();
      expect(mockFamilyRepository.updateUserFamilyGroupId).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findGroupMembers
  // =========================================================================

  describe('findGroupMembers', () => {
    const groupId = 'group-id-001';

    // テスト用の JwtPayload（自分のグループに所属するユーザー）
    const authorizedUser: JwtPayload = {
      sub: 'user-id-001',
      email: 'parent@example.com',
      name: '山田太郎',
      role: 'parent',
      family_group_id: groupId,
    };

    // テスト用のグループメンバーデータ
    const mockMembers: GroupMember[] = [
      {
        id: 'member-id-001',
        group_id: groupId,
        user_id: 'user-id-001',
        joined_at: '2026-01-01T00:00:00Z',
        user: {
          id: 'user-id-001',
          email: 'parent@example.com',
          name: '山田太郎',
          role: 'parent',
          avatar_url: null,
          comment: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      },
      {
        id: 'member-id-002',
        group_id: groupId,
        user_id: 'user-id-002',
        joined_at: '2026-01-02T00:00:00Z',
        user: {
          id: 'user-id-002',
          email: 'child@example.com',
          name: '山田花子',
          role: 'child',
          avatar_url: null,
          comment: null,
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      },
    ];

    it('正常にメンバー一覧を取得できること', async () => {
      mockFamilyRepository.findGroupMembers.mockResolvedValue(mockMembers);

      const result = await service.findGroupMembers(groupId, authorizedUser);

      expect(result).toEqual(mockMembers);
      // 正しい groupId でリポジトリが呼ばれること
      expect(mockFamilyRepository.findGroupMembers).toHaveBeenCalledWith(groupId);
    });

    it('family_group_id が一致しない場合は ForbiddenException をスロー', async () => {
      // 別グループのユーザーがアクセスしようとする
      const unauthorizedUser: JwtPayload = {
        sub: 'user-id-999',
        email: 'other@example.com',
        name: '他家族ユーザー',
        role: 'parent',
        family_group_id: 'other-group-id-999', // 異なるグループID
      };

      await expect(service.findGroupMembers(groupId, unauthorizedUser)).rejects.toThrow(
        ForbiddenException,
      );

      // リポジトリは呼ばれないこと（セキュリティチェックで弾かれる）
      expect(mockFamilyRepository.findGroupMembers).not.toHaveBeenCalled();
    });

    it('子ユーザーが自分のグループにアクセスできること', async () => {
      // 子ロールでも自分のグループなら参照可能
      const childUser: JwtPayload = {
        sub: 'user-id-002',
        email: 'child@example.com',
        name: '山田花子',
        role: 'child',
        family_group_id: groupId,
      };

      mockFamilyRepository.findGroupMembers.mockResolvedValue(mockMembers);

      const result = await service.findGroupMembers(groupId, childUser);

      expect(result).toEqual(mockMembers);
      expect(mockFamilyRepository.findGroupMembers).toHaveBeenCalledWith(groupId);
    });
  });

  // =========================================================================
  // findGroupMember
  // =========================================================================

  describe('findGroupMember', () => {
    const groupId = 'group-id-001';
    const userId = 'user-id-001';

    // テスト用の JwtPayload（自分のグループに所属するユーザー）
    const authorizedUser: JwtPayload = {
      sub: 'user-id-001',
      email: 'parent@example.com',
      name: '山田太郎',
      role: 'parent',
      family_group_id: groupId,
    };

    // テスト用のグループメンバーデータ（1件）
    const mockMember: GroupMember = {
      id: 'member-id-001',
      group_id: groupId,
      user_id: userId,
      joined_at: '2026-01-01T00:00:00Z',
      user: {
        id: userId,
        email: 'parent@example.com',
        name: '山田太郎',
        role: 'parent',
        avatar_url: null,
        comment: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    };

    it('正常系: 自グループのメンバー詳細を取得できること', async () => {
      mockFamilyRepository.findGroupMemberById.mockResolvedValue(mockMember);

      const result = await service.findGroupMember(groupId, userId, authorizedUser);

      expect(result).toEqual(mockMember);
      // 正しい groupId・userId でリポジトリが呼ばれること
      expect(mockFamilyRepository.findGroupMemberById).toHaveBeenCalledWith(groupId, userId);
    });

    it('異常系: family_group_id 不一致で ForbiddenException をスロー', async () => {
      // 別グループのユーザーがアクセスしようとする
      const unauthorizedUser: JwtPayload = {
        sub: 'user-id-999',
        email: 'other@example.com',
        name: '他家族ユーザー',
        role: 'parent',
        family_group_id: 'other-group-id-999', // 異なるグループID
      };

      await expect(service.findGroupMember(groupId, userId, unauthorizedUser)).rejects.toThrow(
        ForbiddenException,
      );

      // リポジトリは呼ばれないこと（セキュリティチェックで弾かれる）
      expect(mockFamilyRepository.findGroupMemberById).not.toHaveBeenCalled();
    });

    it('異常系: 存在しない userId で NotFoundException をスロー', async () => {
      // リポジトリが null を返す（メンバーが存在しない）
      mockFamilyRepository.findGroupMemberById.mockResolvedValue(null);

      await expect(
        service.findGroupMember(groupId, 'non-existent-user-id', authorizedUser),
      ).rejects.toThrow(NotFoundException);

      // リポジトリは呼ばれること
      expect(mockFamilyRepository.findGroupMemberById).toHaveBeenCalledWith(
        groupId,
        'non-existent-user-id',
      );
    });
  });
});
