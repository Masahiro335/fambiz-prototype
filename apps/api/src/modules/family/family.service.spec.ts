import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyRepository } from './family.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import type { Group } from '@fambiz/types';

// =========================================================================
// FamilyRepository のモック
// =========================================================================

const mockFamilyRepository = {
  findGroupByOwnerId: jest.fn(),
  createGroup: jest.fn(),
  addGroupMember: jest.fn(),
  updateUserFamilyGroupId: jest.fn(),
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
});
