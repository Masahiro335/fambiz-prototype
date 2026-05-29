import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyRepository } from './family.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
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
  saveInviteCode: jest.fn(),
  findGroupByInviteCode: jest.fn(),
  findGroupMemberByUserId: jest.fn(),
  removeGroupMember: jest.fn(),
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

  // =========================================================================
  // joinGroup
  // =========================================================================

  describe('joinGroup', () => {
    const validInviteCode = 'valid-invite-code-abc123';

    // グループ参加リクエスト DTO
    const joinGroupDto: JoinGroupDto = {
      inviteCode: validInviteCode,
    };

    // グループに未所属のユーザー（family_group_id は空文字で未所属を表現）
    const newUser: JwtPayload = {
      sub: 'new-user-id-001',
      email: 'newuser@example.com',
      name: '田中一郎',
      role: 'child',
      family_group_id: '',
    };

    // 参加先グループ（招待コードを持つ）
    const targetGroup: Group = {
      id: 'group-id-001',
      group_name: '山田家',
      invite_code: validInviteCode,
      owner_id: 'owner-user-id',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    // 参加後のメンバー情報
    const newMember: GroupMember = {
      id: 'member-id-new',
      group_id: 'group-id-001',
      user_id: 'new-user-id-001',
      joined_at: '2026-05-28T00:00:00Z',
      user: {
        id: 'new-user-id-001',
        email: 'newuser@example.com',
        name: '田中一郎',
        role: 'child',
        avatar_url: null,
        comment: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-05-28T00:00:00Z',
      },
    };

    it('正常系: 未所属ユーザーが有効な招待コードでグループに参加できること', async () => {
      // 未所属ユーザーなので findGroupMemberByUserId は null を返す
      mockFamilyRepository.findGroupMemberByUserId
        .mockResolvedValueOnce(null) // 参加前チェック
        .mockResolvedValueOnce(newMember); // 参加後の取得
      mockFamilyRepository.findGroupByInviteCode.mockResolvedValue(targetGroup);
      mockFamilyRepository.addGroupMember.mockResolvedValue(undefined);

      const result = await service.joinGroup(joinGroupDto, newUser);

      expect(result).toEqual(newMember);
      // 事前チェックでユーザーIDを確認すること
      expect(mockFamilyRepository.findGroupMemberByUserId).toHaveBeenCalledWith(newUser.sub);
      // 招待コードでグループを検索すること
      expect(mockFamilyRepository.findGroupByInviteCode).toHaveBeenCalledWith(validInviteCode);
      // 正しい groupId と userId でメンバーを追加すること
      expect(mockFamilyRepository.addGroupMember).toHaveBeenCalledWith(targetGroup.id, newUser.sub);
    });

    it('異常系: 既にグループに所属している場合は BadRequestException をスロー', async () => {
      // 既にメンバーとして存在する
      mockFamilyRepository.findGroupMemberByUserId.mockResolvedValue(newMember);

      await expect(service.joinGroup(joinGroupDto, newUser)).rejects.toThrow(BadRequestException);

      // グループ検索・メンバー追加は呼ばれないこと
      expect(mockFamilyRepository.findGroupByInviteCode).not.toHaveBeenCalled();
      expect(mockFamilyRepository.addGroupMember).not.toHaveBeenCalled();
    });

    it('異常系: 無効な招待コードの場合は NotFoundException をスロー', async () => {
      // 未所属ユーザー
      mockFamilyRepository.findGroupMemberByUserId.mockResolvedValue(null);
      // 招待コードに一致するグループが存在しない
      mockFamilyRepository.findGroupByInviteCode.mockResolvedValue(null);

      const invalidDto: JoinGroupDto = { inviteCode: 'invalid-code' };

      await expect(service.joinGroup(invalidDto, newUser)).rejects.toThrow(NotFoundException);

      // メンバー追加は呼ばれないこと
      expect(mockFamilyRepository.addGroupMember).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // leaveGroup
  // =========================================================================

  describe('leaveGroup', () => {
    const groupId = 'group-id-001';
    const targetUserId = 'user-id-child-001';

    // 親ユーザー（操作者）
    const parentUser: JwtPayload = {
      sub: 'owner-user-id',
      email: 'parent@example.com',
      name: '山田太郎',
      role: 'parent',
      family_group_id: groupId,
    };

    // 脱退対象のメンバー（子ユーザー）
    const targetMember: GroupMember = {
      id: 'member-id-child-001',
      group_id: groupId,
      user_id: targetUserId,
      joined_at: '2026-01-02T00:00:00Z',
      user: {
        id: targetUserId,
        email: 'child@example.com',
        name: '山田花子',
        role: 'child',
        avatar_url: null,
        comment: null,
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      },
    };

    it('正常系: 親が他メンバーの脱退に成功すること', async () => {
      mockFamilyRepository.findGroupMemberById.mockResolvedValue(targetMember);
      mockFamilyRepository.removeGroupMember.mockResolvedValue(undefined);
      mockFamilyRepository.updateUserFamilyGroupId.mockResolvedValue(undefined);

      const result = await service.leaveGroup(groupId, targetUserId, parentUser);

      expect(result).toEqual({ message: 'メンバーをグループから削除しました' });
      // メンバー存在確認が正しい引数で呼ばれること
      expect(mockFamilyRepository.findGroupMemberById).toHaveBeenCalledWith(groupId, targetUserId);
      // ソフトデリートが正しい引数で呼ばれること
      expect(mockFamilyRepository.removeGroupMember).toHaveBeenCalledWith(groupId, targetUserId);
      // family_group_id リセットが正しい引数で呼ばれること
      expect(mockFamilyRepository.updateUserFamilyGroupId).toHaveBeenCalledWith(targetUserId, null);
    });

    it('異常系: 自分自身を脱退しようとした場合は BadRequestException をスロー', async () => {
      // parentUser.sub と同じ userId を指定して自己削除を試みる
      await expect(service.leaveGroup(groupId, parentUser.sub, parentUser)).rejects.toThrow(
        BadRequestException,
      );

      // リポジトリは呼ばれないこと
      expect(mockFamilyRepository.findGroupMemberById).not.toHaveBeenCalled();
      expect(mockFamilyRepository.removeGroupMember).not.toHaveBeenCalled();
    });

    it('異常系: 対象メンバーが存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが null を返す（メンバーが存在しない）
      mockFamilyRepository.findGroupMemberById.mockResolvedValue(null);

      await expect(service.leaveGroup(groupId, 'non-existent-user-id', parentUser)).rejects.toThrow(
        NotFoundException,
      );

      // 存在確認は呼ばれること
      expect(mockFamilyRepository.findGroupMemberById).toHaveBeenCalledWith(
        groupId,
        'non-existent-user-id',
      );
      // 削除は呼ばれないこと
      expect(mockFamilyRepository.removeGroupMember).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // generateInviteCode
  // =========================================================================

  describe('generateInviteCode', () => {
    const groupId = 'group-id-001';

    // テスト用の JwtPayload（自分のグループに所属する親ユーザー）
    const parentUser: JwtPayload = {
      sub: 'owner-user-id',
      email: 'parent@example.com',
      name: '山田太郎',
      role: 'parent',
      family_group_id: groupId,
    };

    it('正常系: 親ユーザーが招待コードを生成できること', async () => {
      mockFamilyRepository.saveInviteCode.mockResolvedValue(undefined);

      const result = await service.generateInviteCode(groupId, parentUser);

      // inviteCode が文字列であること
      expect(typeof result.inviteCode).toBe('string');
      // inviteCode が空でないこと（64文字の16進数文字列）
      expect(result.inviteCode.length).toBeGreaterThan(0);
      // expiresAt が文字列であること
      expect(typeof result.expiresAt).toBe('string');
      // saveInviteCode が正しい groupId とトークンで呼ばれること
      expect(mockFamilyRepository.saveInviteCode).toHaveBeenCalledWith(groupId, result.inviteCode);
    });

    it('異常系: family_group_id 不一致で ForbiddenException をスロー', async () => {
      // 別グループの親ユーザーがアクセスしようとする
      const unauthorizedUser: JwtPayload = {
        sub: 'user-id-999',
        email: 'other@example.com',
        name: '他家族ユーザー',
        role: 'parent',
        family_group_id: 'other-group-id-999', // 異なるグループID
      };

      await expect(service.generateInviteCode(groupId, unauthorizedUser)).rejects.toThrow(
        ForbiddenException,
      );

      // リポジトリは呼ばれないこと（セキュリティチェックで弾かれる）
      expect(mockFamilyRepository.saveInviteCode).not.toHaveBeenCalled();
    });
  });
});
