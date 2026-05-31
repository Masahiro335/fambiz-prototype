import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsRepository } from './goals.repository';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateGoalStatusDto } from './dto/update-goal-status.dto';
import type { Goal, JwtPayload } from '@fambiz/types';

// =========================================================================
// GoalsRepository のモック
// =========================================================================

const mockGoalsRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStatus: jest.fn(),
};

// =========================================================================
// テスト本体
// =========================================================================

describe('GoalsService', () => {
  let service: GoalsService;

  // テスト用の家族グループID
  const groupId = 'group-id-001';

  // テスト用の親ユーザー（自グループに所属）
  const parentUser: JwtPayload = {
    sub: 'parent-user-id-001',
    email: 'parent@example.com',
    name: '山田太郎',
    role: 'parent',
    family_group_id: groupId,
  };

  // テスト用の子ユーザー（自グループに所属）
  const childUser: JwtPayload = {
    sub: 'child-user-id-001',
    email: 'child@example.com',
    name: '山田花子',
    role: 'child',
    family_group_id: groupId,
  };

  // テスト用の目標データ（not_started 状態）
  const mockGoal: Goal = {
    id: 'goal-id-001',
    group_id: groupId,
    creator_id: 'parent-user-id-001',
    assignee_id: 'child-user-id-001',
    task_id: null,
    goal_name: '今月は皿洗いを10回する',
    goal_reward: 500,
    target_count: 10,
    action: '毎日皿洗いをする',
    and_condition_flag: false,
    status: 'not_started',
    target_month: '2026-05',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: GoalsRepository,
          useValue: mockGoalsRepository,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);

    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  it('サービスが正常に生成されること', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // findAll（FUN-GOAL-001）
  // =========================================================================

  describe('findAll', () => {
    // テスト用の目標一覧
    const mockGoals: Goal[] = [mockGoal];

    it('正常に目標一覧を取得できること', async () => {
      mockGoalsRepository.findAll.mockResolvedValue(mockGoals);

      const result = await service.findAll(groupId, parentUser);

      expect(result).toEqual(mockGoals);
      // 正しい引数でリポジトリが呼ばれること
      expect(mockGoalsRepository.findAll).toHaveBeenCalledWith(groupId, undefined);
    });

    it('子ユーザーが自グループの目標一覧を取得できること', async () => {
      mockGoalsRepository.findAll.mockResolvedValue(mockGoals);

      const result = await service.findAll(groupId, childUser);

      expect(result).toEqual(mockGoals);
      expect(mockGoalsRepository.findAll).toHaveBeenCalledWith(groupId, undefined);
    });

    it('対象月フィルタを指定して目標一覧を取得できること', async () => {
      mockGoalsRepository.findAll.mockResolvedValue(mockGoals);

      const result = await service.findAll(groupId, parentUser, '2026-05');

      expect(result).toEqual(mockGoals);
      // フィルタが正しく渡されること
      expect(mockGoalsRepository.findAll).toHaveBeenCalledWith(groupId, '2026-05');
    });

    it('groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー', async () => {
      // 別グループのユーザーがアクセスしようとする
      const unauthorizedUser: JwtPayload = {
        sub: 'user-id-999',
        email: 'other@example.com',
        name: '他家族ユーザー',
        role: 'parent',
        family_group_id: 'other-group-id-999', // 異なるグループID
      };

      await expect(service.findAll(groupId, unauthorizedUser)).rejects.toThrow(ForbiddenException);

      // リポジトリは呼ばれないこと（セキュリティチェックで弾かれる）
      expect(mockGoalsRepository.findAll).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findById（FUN-GOAL-002）
  // =========================================================================

  describe('findById', () => {
    const goalId = 'goal-id-001';

    it('正常に目標詳細を取得できること', async () => {
      mockGoalsRepository.findById.mockResolvedValue(mockGoal);

      const result = await service.findById(goalId, parentUser);

      expect(result).toEqual(mockGoal);
      // 正しい goalId と family_group_id でリポジトリが呼ばれること
      expect(mockGoalsRepository.findById).toHaveBeenCalledWith(goalId, parentUser.family_group_id);
    });

    it('子ユーザーが目標詳細を取得できること', async () => {
      mockGoalsRepository.findById.mockResolvedValue(mockGoal);

      const result = await service.findById(goalId, childUser);

      expect(result).toEqual(mockGoal);
      expect(mockGoalsRepository.findById).toHaveBeenCalledWith(goalId, childUser.family_group_id);
    });

    it('目標が存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが null を返す（目標が存在しないまたは他グループの目標）
      mockGoalsRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-goal-id', parentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // createGoal（FUN-GOAL-003・親のみ）
  // =========================================================================

  describe('createGoal', () => {
    // 目標作成リクエスト DTO（groupId が自グループと一致）
    const createGoalDto: CreateGoalDto = {
      groupId,
      goalName: '今月は皿洗いを10回する',
      goalReward: 500,
      targetMonth: '2026-05',
      assigneeId: 'child-user-id-001',
      targetCount: 10,
      action: '毎日皿洗いをする',
      andConditionFlag: false,
    };

    it('正常に目標を作成できること', async () => {
      // リポジトリが目標を返すよう設定
      mockGoalsRepository.create.mockResolvedValue(mockGoal);

      const result = await service.createGoal(createGoalDto, parentUser);

      expect(result).toEqual(mockGoal);
      // 正しい引数でリポジトリが呼ばれること
      expect(mockGoalsRepository.create).toHaveBeenCalledWith(
        createGoalDto.groupId,
        parentUser.sub,
        createGoalDto.goalName,
        createGoalDto.goalReward,
        createGoalDto.targetMonth,
        createGoalDto.assigneeId,
        createGoalDto.taskId,
        createGoalDto.targetCount,
        createGoalDto.action,
        createGoalDto.andConditionFlag,
      );
    });

    it('groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー', async () => {
      // 異なる groupId を持つ DTO
      const dtoWithWrongGroupId: CreateGoalDto = {
        ...createGoalDto,
        groupId: 'other-group-id-999',
      };

      await expect(service.createGoal(dtoWithWrongGroupId, parentUser)).rejects.toThrow(
        ForbiddenException,
      );

      // リポジトリは呼ばれないこと（セキュリティチェックで弾かれる）
      expect(mockGoalsRepository.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateGoal（FUN-GOAL-003 編集・親のみ）
  // =========================================================================

  describe('updateGoal', () => {
    const goalId = 'goal-id-001';

    // 目標更新リクエスト DTO（一部フィールドのみ更新）
    const updateGoalDto: UpdateGoalDto = {
      goalName: '今月は洗濯を15回する',
      goalReward: 700,
    };

    // 更新後の目標データ
    const updatedMockGoal: Goal = {
      ...mockGoal,
      goal_name: '今月は洗濯を15回する',
      goal_reward: 700,
    };

    it('正常に目標を更新できること', async () => {
      mockGoalsRepository.update.mockResolvedValue(updatedMockGoal);

      const result = await service.updateGoal(goalId, updateGoalDto, parentUser);

      expect(result).toEqual(updatedMockGoal);
      // 正しい引数でリポジトリが呼ばれること
      expect(mockGoalsRepository.update).toHaveBeenCalledWith(
        goalId,
        parentUser.family_group_id,
        {
          goal_name: '今月は洗濯を15回する',
          goal_reward: 700,
          target_month: undefined,
          assignee_id: undefined,
          task_id: undefined,
          target_count: undefined,
          action: undefined,
          and_condition_flag: undefined,
        },
      );
    });

    it('目標が存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが null を返す（目標が存在しないまたは他グループの目標）
      mockGoalsRepository.update.mockResolvedValue(null);

      await expect(
        service.updateGoal('non-existent-goal-id', updateGoalDto, parentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // deleteGoal（FUN-GOAL-004・親のみ）
  // =========================================================================

  describe('deleteGoal', () => {
    const goalId = 'goal-id-001';

    it('正常に目標を削除できること', async () => {
      // リポジトリが true を返す（削除成功）
      mockGoalsRepository.delete.mockResolvedValue(true);

      const result = await service.deleteGoal(goalId, parentUser);

      expect(result).toEqual({ message: '目標を削除しました' });
      // 正しい引数でリポジトリが呼ばれること
      expect(mockGoalsRepository.delete).toHaveBeenCalledWith(goalId, parentUser.family_group_id);
    });

    it('目標が存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが false を返す（目標が存在しないまたは他グループの目標）
      mockGoalsRepository.delete.mockResolvedValue(false);

      await expect(service.deleteGoal('non-existent-goal-id', parentUser)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockGoalsRepository.delete).toHaveBeenCalledWith(
        'non-existent-goal-id',
        parentUser.family_group_id,
      );
    });
  });

  // =========================================================================
  // updateGoalStatus（FUN-GOAL-005）
  // =========================================================================

  describe('updateGoalStatus', () => {
    const goalId = 'goal-id-001';

    // 各ステータスの目標データ
    const notStartedGoal: Goal = { ...mockGoal, status: 'not_started' };
    const inProgressGoal: Goal = { ...mockGoal, status: 'in_progress' };
    const pendingApprovalGoal: Goal = { ...mockGoal, status: 'pending_approval' };
    const achievedGoal: Goal = { ...mockGoal, status: 'achieved' };
    const failedGoal: Goal = { ...mockGoal, status: 'failed' };

    it('not_started → in_progress を child が挑戦宣言できること', async () => {
      const dto: UpdateGoalStatusDto = { status: 'in_progress' };
      mockGoalsRepository.findById.mockResolvedValue(notStartedGoal);
      mockGoalsRepository.updateStatus.mockResolvedValue({
        ...notStartedGoal,
        status: 'in_progress',
      });

      const result = await service.updateGoalStatus(goalId, dto, childUser);

      expect(result.status).toBe('in_progress');
      expect(mockGoalsRepository.updateStatus).toHaveBeenCalledWith(
        goalId,
        childUser.family_group_id,
        'in_progress',
      );
    });

    it('in_progress → pending_approval を child が達成申請できること', async () => {
      const dto: UpdateGoalStatusDto = { status: 'pending_approval' };
      mockGoalsRepository.findById.mockResolvedValue(inProgressGoal);
      mockGoalsRepository.updateStatus.mockResolvedValue({
        ...inProgressGoal,
        status: 'pending_approval',
      });

      const result = await service.updateGoalStatus(goalId, dto, childUser);

      expect(result.status).toBe('pending_approval');
      expect(mockGoalsRepository.updateStatus).toHaveBeenCalledWith(
        goalId,
        childUser.family_group_id,
        'pending_approval',
      );
    });

    it('pending_approval → achieved を parent が達成承認できること', async () => {
      const dto: UpdateGoalStatusDto = { status: 'achieved' };
      mockGoalsRepository.findById.mockResolvedValue(pendingApprovalGoal);
      mockGoalsRepository.updateStatus.mockResolvedValue({
        ...pendingApprovalGoal,
        status: 'achieved',
      });

      const result = await service.updateGoalStatus(goalId, dto, parentUser);

      expect(result.status).toBe('achieved');
      expect(mockGoalsRepository.updateStatus).toHaveBeenCalledWith(
        goalId,
        parentUser.family_group_id,
        'achieved',
      );
    });

    it('pending_approval → failed を parent が未達成判定できること', async () => {
      const dto: UpdateGoalStatusDto = { status: 'failed' };
      mockGoalsRepository.findById.mockResolvedValue(pendingApprovalGoal);
      mockGoalsRepository.updateStatus.mockResolvedValue({
        ...pendingApprovalGoal,
        status: 'failed',
      });

      const result = await service.updateGoalStatus(goalId, dto, parentUser);

      expect(result.status).toBe('failed');
    });

    it('pending_approval → in_progress を parent が差し戻しできること', async () => {
      const dto: UpdateGoalStatusDto = { status: 'in_progress' };
      mockGoalsRepository.findById.mockResolvedValue(pendingApprovalGoal);
      mockGoalsRepository.updateStatus.mockResolvedValue({
        ...pendingApprovalGoal,
        status: 'in_progress',
      });

      const result = await service.updateGoalStatus(goalId, dto, parentUser);

      expect(result.status).toBe('in_progress');
    });

    it('parent が not_started → in_progress を試みると ForbiddenException をスロー', async () => {
      const dto: UpdateGoalStatusDto = { status: 'in_progress' };
      mockGoalsRepository.findById.mockResolvedValue(notStartedGoal);

      await expect(service.updateGoalStatus(goalId, dto, parentUser)).rejects.toThrow(
        ForbiddenException,
      );

      // ステータス更新リポジトリは呼ばれないこと
      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('parent が in_progress → pending_approval を試みると ForbiddenException をスロー', async () => {
      const dto: UpdateGoalStatusDto = { status: 'pending_approval' };
      mockGoalsRepository.findById.mockResolvedValue(inProgressGoal);

      await expect(service.updateGoalStatus(goalId, dto, parentUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('child が pending_approval → achieved を試みると ForbiddenException をスロー', async () => {
      const dto: UpdateGoalStatusDto = { status: 'achieved' };
      mockGoalsRepository.findById.mockResolvedValue(pendingApprovalGoal);

      await expect(service.updateGoalStatus(goalId, dto, childUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('child が pending_approval → failed を試みると ForbiddenException をスロー', async () => {
      const dto: UpdateGoalStatusDto = { status: 'failed' };
      mockGoalsRepository.findById.mockResolvedValue(pendingApprovalGoal);

      await expect(service.updateGoalStatus(goalId, dto, childUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('child が pending_approval → in_progress（差し戻し）を試みると ForbiddenException をスロー', async () => {
      const dto: UpdateGoalStatusDto = { status: 'in_progress' };
      mockGoalsRepository.findById.mockResolvedValue(pendingApprovalGoal);

      await expect(service.updateGoalStatus(goalId, dto, childUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('achieved からの遷移が BadRequestException をスロー（終端ステータス）', async () => {
      const dto: UpdateGoalStatusDto = { status: 'in_progress' };
      mockGoalsRepository.findById.mockResolvedValue(achievedGoal);

      await expect(service.updateGoalStatus(goalId, dto, parentUser)).rejects.toThrow(
        BadRequestException,
      );

      // ステータス更新リポジトリは呼ばれないこと
      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('failed からの遷移が BadRequestException をスロー（終端ステータス）', async () => {
      const dto: UpdateGoalStatusDto = { status: 'in_progress' };
      mockGoalsRepository.findById.mockResolvedValue(failedGoal);

      await expect(service.updateGoalStatus(goalId, dto, parentUser)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('不正なステータス遷移（not_started → achieved）は BadRequestException をスロー', async () => {
      const dto: UpdateGoalStatusDto = { status: 'achieved' };
      mockGoalsRepository.findById.mockResolvedValue(notStartedGoal);

      await expect(service.updateGoalStatus(goalId, dto, parentUser)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('目標が存在しない場合は NotFoundException をスロー', async () => {
      const dto: UpdateGoalStatusDto = { status: 'in_progress' };
      // findById が null を返す（目標が存在しないまたは他グループの目標）
      mockGoalsRepository.findById.mockResolvedValue(null);

      await expect(service.updateGoalStatus('non-existent-goal-id', dto, childUser)).rejects.toThrow(
        NotFoundException,
      );

      // 存在確認でエラーになるためステータス更新リポジトリは呼ばれないこと
      expect(mockGoalsRepository.updateStatus).not.toHaveBeenCalled();
    });
  });
});
