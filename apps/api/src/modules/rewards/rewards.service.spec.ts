import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsRepository } from './rewards.repository';
import { EvaluationRequestDto } from './dto/evaluation-request.dto';
import { GetRewardQueryDto } from './dto/get-reward-query.dto';
import { GetRewardGraphQueryDto } from './dto/get-reward-graph-query.dto';
import type { Reward, TaskCompletion, JwtPayload } from '@fambiz/types';

// =========================================================================
// RewardsRepository のモック
// =========================================================================

const mockRewardsRepository = {
  findByChildAndMonth: jest.fn(),
  findById: jest.fn(),
  findByChildAndMonths: jest.fn(),
  create: jest.fn(),
  updateAmounts: jest.fn(),
  updateEvaluation: jest.fn(),
  markAsPaid: jest.fn(),
  findCompletionsByMonth: jest.fn(),
  calcTaskRewardTotal: jest.fn(),
  calcBonusRewardTotal: jest.fn(),
};

// =========================================================================
// テスト本体
// =========================================================================

describe('RewardsService', () => {
  let service: RewardsService;

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

  // テスト用の報酬データ（pending ステータス）
  const mockReward: Reward = {
    id: 'reward-id-001',
    group_id: groupId,
    child_id: 'child-user-id-001',
    target_month: '2026-06',
    task_reward_total: 1500,
    bonus_reward_total: 500,
    total_amount: 2000,
    evaluation_score: null,
    evaluation_comment: null,
    status: 'pending',
    paid_at: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        {
          provide: RewardsRepository,
          useValue: mockRewardsRepository,
        },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);

    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  it('サービスが正常に生成されること', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getReward（FUN-REWARD-001）
  // =========================================================================

  describe('getReward', () => {
    const query: GetRewardQueryDto = {
      groupId,
      childId: 'child-user-id-001',
      targetMonth: '2026-06',
    };

    it('groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー', async () => {
      // 別グループのユーザーがアクセスしようとする
      const unauthorizedUser: JwtPayload = {
        sub: 'user-id-999',
        email: 'other@example.com',
        name: '他家族ユーザー',
        role: 'parent',
        family_group_id: 'other-group-id-999', // 異なるグループID
      };

      await expect(service.getReward(query, unauthorizedUser)).rejects.toThrow(ForbiddenException);

      // リポジトリは呼ばれないこと（セキュリティチェックで弾かれる）
      expect(mockRewardsRepository.findByChildAndMonth).not.toHaveBeenCalled();
    });

    it('報酬レコードが存在しない場合は計算して新規作成すること', async () => {
      // 既存レコードなし
      mockRewardsRepository.findByChildAndMonth.mockResolvedValue(null);
      mockRewardsRepository.calcTaskRewardTotal.mockResolvedValue(1500);
      mockRewardsRepository.calcBonusRewardTotal.mockResolvedValue(500);
      mockRewardsRepository.create.mockResolvedValue(mockReward);

      const result = await service.getReward(query, parentUser);

      expect(result).toEqual(mockReward);
      // 集計が正しい引数で呼ばれること
      expect(mockRewardsRepository.calcTaskRewardTotal).toHaveBeenCalledWith(
        'child-user-id-001',
        groupId,
        '2026-06',
      );
      expect(mockRewardsRepository.calcBonusRewardTotal).toHaveBeenCalledWith(
        'child-user-id-001',
        groupId,
        '2026-06',
      );
      // 正しい金額で INSERT が呼ばれること
      expect(mockRewardsRepository.create).toHaveBeenCalledWith(
        groupId,
        'child-user-id-001',
        '2026-06',
        1500,
        500,
        2000,
      );
      // UPDATE は呼ばれないこと
      expect(mockRewardsRepository.updateAmounts).not.toHaveBeenCalled();
    });

    it('pending の既存レコードが存在する場合は再計算して更新すること', async () => {
      // pending の既存レコードあり
      mockRewardsRepository.findByChildAndMonth.mockResolvedValue(mockReward);
      mockRewardsRepository.calcTaskRewardTotal.mockResolvedValue(2000);
      mockRewardsRepository.calcBonusRewardTotal.mockResolvedValue(1000);
      const updatedReward: Reward = {
        ...mockReward,
        task_reward_total: 2000,
        bonus_reward_total: 1000,
        total_amount: 3000,
      };
      mockRewardsRepository.updateAmounts.mockResolvedValue(updatedReward);

      const result = await service.getReward(query, childUser);

      expect(result).toEqual(updatedReward);
      // 再計算後に UPDATE が呼ばれること
      expect(mockRewardsRepository.updateAmounts).toHaveBeenCalledWith(
        mockReward.id,
        2000,
        1000,
        3000,
      );
      // INSERT は呼ばれないこと
      expect(mockRewardsRepository.create).not.toHaveBeenCalled();
    });

    it('paid の既存レコードが存在する場合は再計算せずそのまま返すこと', async () => {
      // paid の既存レコードあり
      const paidReward: Reward = { ...mockReward, status: 'paid', paid_at: '2026-06-30T00:00:00Z' };
      mockRewardsRepository.findByChildAndMonth.mockResolvedValue(paidReward);

      const result = await service.getReward(query, parentUser);

      expect(result).toEqual(paidReward);
      // 再計算しないこと
      expect(mockRewardsRepository.calcTaskRewardTotal).not.toHaveBeenCalled();
      expect(mockRewardsRepository.calcBonusRewardTotal).not.toHaveBeenCalled();
      expect(mockRewardsRepository.updateAmounts).not.toHaveBeenCalled();
      expect(mockRewardsRepository.create).not.toHaveBeenCalled();
    });

    it('子ロールが他の子の childId を指定した場合は ForbiddenException をスロー', async () => {
      // childUser.sub = 'child-user-id-001' だが、別の子の ID を指定する
      const otherChildQuery: GetRewardQueryDto = {
        groupId,
        childId: 'child-user-id-002', // 自分以外の子
        targetMonth: '2026-06',
      };

      await expect(service.getReward(otherChildQuery, childUser)).rejects.toThrow(ForbiddenException);

      // リポジトリは呼ばれないこと
      expect(mockRewardsRepository.findByChildAndMonth).not.toHaveBeenCalled();
    });

    it('子ロールが自分自身の childId を指定した場合は正常に取得できること', async () => {
      // childUser.sub = 'child-user-id-001' と一致する childId を指定する
      // paid レコードを返すことで再計算パスを回避し、mock 汚染を防ぐ
      const paidReward: Reward = { ...mockReward, status: 'paid', paid_at: '2026-06-30T00:00:00Z' };
      mockRewardsRepository.findByChildAndMonth.mockResolvedValue(paidReward);

      const result = await service.getReward(query, childUser);

      expect(result).toEqual(paidReward);
    });

    it('端数を含む場合は Math.floor で切り捨てて計算すること', async () => {
      mockRewardsRepository.findByChildAndMonth.mockResolvedValue(null);
      // 端数ありの値（実際の切り捨ては Repository 側で行う想定だが、Service での合計計算を確認）
      mockRewardsRepository.calcTaskRewardTotal.mockResolvedValue(1333);
      mockRewardsRepository.calcBonusRewardTotal.mockResolvedValue(666);
      mockRewardsRepository.create.mockResolvedValue({
        ...mockReward,
        task_reward_total: 1333,
        bonus_reward_total: 666,
        total_amount: 1999,
      });

      await service.getReward(query, parentUser);

      // 合計は Math.floor(1333 + 666) = 1999
      expect(mockRewardsRepository.create).toHaveBeenCalledWith(
        groupId,
        'child-user-id-001',
        '2026-06',
        1333,
        666,
        1999,
      );
    });
  });

  // =========================================================================
  // getRewardGraph（FUN-REWARD-002）
  // =========================================================================

  describe('getRewardGraph', () => {
    const query: GetRewardGraphQueryDto = {
      groupId,
      childId: 'child-user-id-001',
      targetMonth: '2026-06',
      historyMonths: 3,
    };

    it('groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー', async () => {
      const unauthorizedUser: JwtPayload = {
        sub: 'user-id-999',
        email: 'other@example.com',
        name: '他家族ユーザー',
        role: 'parent',
        family_group_id: 'other-group-id-999',
      };

      await expect(service.getRewardGraph(query, unauthorizedUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockRewardsRepository.findByChildAndMonths).not.toHaveBeenCalled();
    });

    it('子ロールが他の子の childId を指定した場合は ForbiddenException をスロー', async () => {
      const otherChildQuery: GetRewardGraphQueryDto = {
        groupId,
        childId: 'child-user-id-002', // 自分以外の子
        targetMonth: '2026-06',
        historyMonths: 3,
      };

      await expect(service.getRewardGraph(otherChildQuery, childUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockRewardsRepository.findByChildAndMonths).not.toHaveBeenCalled();
    });

    it('historyMonths=3 で3ヶ月分の月リストを生成すること', async () => {
      mockRewardsRepository.findByChildAndMonths.mockResolvedValue([]);

      const result = await service.getRewardGraph(query, parentUser);

      // 2026-06 から3ヶ月前: 2026-04, 2026-05, 2026-06
      expect(mockRewardsRepository.findByChildAndMonths).toHaveBeenCalledWith(
        'child-user-id-001',
        groupId,
        ['2026-04', '2026-05', '2026-06'],
      );
      expect(result.months).toHaveLength(3);
    });

    it('DB にレコードがない月は 0 円として返すこと', async () => {
      // 2026-05 のみレコードあり
      const mayReward: Reward = {
        ...mockReward,
        id: 'reward-id-may',
        target_month: '2026-05',
        task_reward_total: 1000,
        bonus_reward_total: 200,
        total_amount: 1200,
      };
      mockRewardsRepository.findByChildAndMonths.mockResolvedValue([mayReward]);

      const result = await service.getRewardGraph(query, parentUser);

      expect(result.months).toEqual([
        { target_month: '2026-04', task_reward_total: 0, bonus_reward_total: 0, total_amount: 0 },
        {
          target_month: '2026-05',
          task_reward_total: 1000,
          bonus_reward_total: 200,
          total_amount: 1200,
        },
        { target_month: '2026-06', task_reward_total: 0, bonus_reward_total: 0, total_amount: 0 },
      ]);
    });

    it('年をまたぐ月リストを正しく生成すること', async () => {
      const crossYearQuery: GetRewardGraphQueryDto = {
        groupId,
        childId: 'child-user-id-001',
        targetMonth: '2026-02',
        historyMonths: 3,
      };
      mockRewardsRepository.findByChildAndMonths.mockResolvedValue([]);

      await service.getRewardGraph(crossYearQuery, parentUser);

      // 2026-02 から3ヶ月前: 2025-12, 2026-01, 2026-02
      expect(mockRewardsRepository.findByChildAndMonths).toHaveBeenCalledWith(
        'child-user-id-001',
        groupId,
        ['2025-12', '2026-01', '2026-02'],
      );
    });
  });

  // =========================================================================
  // registerEvaluation（FUN-REWARD-003）
  // =========================================================================

  describe('registerEvaluation', () => {
    const rewardId = 'reward-id-001';
    const dto: EvaluationRequestDto = {
      evaluationScore: 4,
      evaluationComment: '今月はよく頑張りました！',
    };

    it('正常に評価を登録できること', async () => {
      const evaluatedReward: Reward = {
        ...mockReward,
        evaluation_score: 4,
        evaluation_comment: '今月はよく頑張りました！',
      };
      mockRewardsRepository.updateEvaluation.mockResolvedValue(evaluatedReward);

      const result = await service.registerEvaluation(rewardId, dto, parentUser);

      expect(result).toEqual(evaluatedReward);
      expect(mockRewardsRepository.updateEvaluation).toHaveBeenCalledWith(
        rewardId,
        parentUser.family_group_id,
        dto.evaluationScore,
        dto.evaluationComment,
      );
    });

    it('報酬が存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが null を返す（報酬が存在しないまたは他グループの報酬）
      mockRewardsRepository.updateEvaluation.mockResolvedValue(null);

      await expect(
        service.registerEvaluation('non-existent-reward-id', dto, parentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // payReward（FUN-REWARD-004）
  // =========================================================================

  describe('payReward', () => {
    const rewardId = 'reward-id-001';

    it('正常に支払い完了処理ができること', async () => {
      mockRewardsRepository.findById.mockResolvedValue(mockReward);
      const paidReward: Reward = {
        ...mockReward,
        status: 'paid',
        paid_at: '2026-06-30T10:00:00Z',
      };
      mockRewardsRepository.markAsPaid.mockResolvedValue(paidReward);

      const result = await service.payReward(rewardId, parentUser);

      expect(result.status).toBe('paid');
      expect(result.paid_at).not.toBeNull();
      expect(mockRewardsRepository.markAsPaid).toHaveBeenCalledWith(
        rewardId,
        parentUser.family_group_id,
        expect.any(String), // ISO 8601 形式の現在日時
      );
    });

    it('報酬が存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが null を返す（報酬が存在しないまたは他グループの報酬）
      mockRewardsRepository.findById.mockResolvedValue(null);

      await expect(service.payReward('non-existent-reward-id', parentUser)).rejects.toThrow(
        NotFoundException,
      );

      // markAsPaid は呼ばれないこと
      expect(mockRewardsRepository.markAsPaid).not.toHaveBeenCalled();
    });

    it('既に paid の場合は BadRequestException をスロー（二重支払い防止）', async () => {
      // 既に paid の報酬を返す
      const paidReward: Reward = {
        ...mockReward,
        status: 'paid',
        paid_at: '2026-06-30T10:00:00Z',
      };
      mockRewardsRepository.findById.mockResolvedValue(paidReward);

      await expect(service.payReward(rewardId, parentUser)).rejects.toThrow(BadRequestException);

      // markAsPaid は呼ばれないこと（二重支払いガード）
      expect(mockRewardsRepository.markAsPaid).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getCompletions（FUN-REWARD-005）
  // =========================================================================

  describe('getCompletions', () => {
    const rewardId = 'reward-id-001';

    const mockCompletions: TaskCompletion[] = [
      {
        id: 'completion-id-001',
        task_id: 'task-id-001',
        child_id: 'child-user-id-001',
        reported_at: '2026-06-10T10:00:00Z',
        approved_by: 'parent-user-id-001',
        approved_at: '2026-06-10T11:00:00Z',
        confirmed_reward: 500,
        created_at: '2026-06-10T10:00:00Z',
        updated_at: '2026-06-10T11:00:00Z',
      },
    ];

    it('正常にタスク完了履歴を取得できること', async () => {
      mockRewardsRepository.findById.mockResolvedValue(mockReward);
      mockRewardsRepository.findCompletionsByMonth.mockResolvedValue(mockCompletions);

      const result = await service.getCompletions(rewardId, parentUser);

      expect(result).toEqual(mockCompletions);
      // 報酬の child_id と target_month でタスク完了履歴を取得すること
      expect(mockRewardsRepository.findCompletionsByMonth).toHaveBeenCalledWith(
        mockReward.child_id,
        parentUser.family_group_id,
        mockReward.target_month,
      );
    });

    it('報酬が存在しない場合は NotFoundException をスロー', async () => {
      // 他グループの報酬または存在しない報酬の場合
      mockRewardsRepository.findById.mockResolvedValue(null);

      await expect(service.getCompletions('non-existent-reward-id', parentUser)).rejects.toThrow(
        NotFoundException,
      );

      // findCompletionsByMonth は呼ばれないこと
      expect(mockRewardsRepository.findCompletionsByMonth).not.toHaveBeenCalled();
    });

    it('子ユーザーがタスク完了履歴を取得できること', async () => {
      mockRewardsRepository.findById.mockResolvedValue(mockReward);
      mockRewardsRepository.findCompletionsByMonth.mockResolvedValue(mockCompletions);

      const result = await service.getCompletions(rewardId, childUser);

      expect(result).toEqual(mockCompletions);
    });
  });
});
