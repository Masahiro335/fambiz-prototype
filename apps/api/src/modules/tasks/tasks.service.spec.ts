import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { RewardsRepository } from '../rewards/rewards.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import type { Task, JwtPayload } from '@fambiz/types';

// =========================================================================
// TasksRepository のモック
// =========================================================================

const mockTasksRepository = {
  createTask: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  updateTaskStatus: jest.fn(),
  createTaskCompletion: jest.fn(),
  approveTaskCompletion: jest.fn(),
  cancelTaskCompletion: jest.fn(),
};

// =========================================================================
// RewardsRepository のモック
// =========================================================================

const mockRewardsRepository = {
  findByChildAndMonth: jest.fn(),
};

// =========================================================================
// テスト本体
// =========================================================================

describe('TasksService', () => {
  let service: TasksService;

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

  // テスト用のタスクデータ
  const mockTask: Task = {
    id: 'task-id-001',
    group_id: groupId,
    creator_id: 'parent-user-id-001',
    assignee_id: 'child-user-id-001',
    task_name: '食器洗い',
    category: '家事',
    reward_amount: 100,
    status: 'pending',
    start_time: null,
    end_time: null,
    due_date: '2026-05-31T23:59:59Z',
    memo: '夕食前までに終わらせてね',
    created_at: '2026-05-29T00:00:00Z',
    updated_at: '2026-05-29T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
        {
          provide: RewardsRepository,
          useValue: mockRewardsRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    // 各テスト前にモックをリセット
    jest.clearAllMocks();

    // task_completions 操作メソッドのデフォルト戻り値を設定する
    mockTasksRepository.createTaskCompletion.mockResolvedValue(undefined);
    mockTasksRepository.approveTaskCompletion.mockResolvedValue(undefined);
    mockTasksRepository.cancelTaskCompletion.mockResolvedValue(undefined);
    // 当月の報酬がデフォルトで未払い（null）になるよう設定する
    mockRewardsRepository.findByChildAndMonth.mockResolvedValue(null);
  });

  it('サービスが正常に生成されること', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createTask
  // =========================================================================

  describe('createTask', () => {
    // タスク作成リクエスト DTO（groupId が自グループと一致）
    const createTaskDto: CreateTaskDto = {
      groupId,
      assigneeId: 'child-user-id-001',
      taskName: '食器洗い',
      category: '家事',
      rewardAmount: 100,
      dueDate: '2026-05-31T23:59:59Z',
      memo: '夕食前までに終わらせてね',
    };

    it('正常にタスクを作成できること', async () => {
      // リポジトリがタスクを返すよう設定
      mockTasksRepository.createTask.mockResolvedValue(mockTask);

      const result = await service.createTask(createTaskDto, parentUser);

      expect(result).toEqual(mockTask);
      // 正しい引数でリポジトリが呼ばれること
      expect(mockTasksRepository.createTask).toHaveBeenCalledWith(
        createTaskDto.groupId,
        parentUser.sub,
        createTaskDto.assigneeId,
        createTaskDto.taskName,
        createTaskDto.category,
        createTaskDto.rewardAmount,
        createTaskDto.startTime,
        createTaskDto.endTime,
        createTaskDto.dueDate,
        createTaskDto.memo,
      );
    });

    it('groupId が user.family_group_id と一致しない場合は ForbiddenException をスロー', async () => {
      // 異なる groupId を持つ DTO
      const dtWithWrongGroupId: CreateTaskDto = {
        ...createTaskDto,
        groupId: 'other-group-id-999',
      };

      await expect(service.createTask(dtWithWrongGroupId, parentUser)).rejects.toThrow(
        ForbiddenException,
      );

      // リポジトリは呼ばれないこと（セキュリティチェックで弾かれる）
      expect(mockTasksRepository.createTask).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findAll
  // =========================================================================

  describe('findAll', () => {
    // テスト用のタスク一覧
    const mockTasks: Task[] = [mockTask];

    it('正常にタスク一覧を取得できること', async () => {
      mockTasksRepository.findAll.mockResolvedValue(mockTasks);

      const result = await service.findAll(groupId, parentUser);

      expect(result).toEqual(mockTasks);
      // 正しいフィルタでリポジトリが呼ばれること
      expect(mockTasksRepository.findAll).toHaveBeenCalledWith({
        groupId,
        status: undefined,
        assigneeId: undefined,
        keyword: undefined,
        month: undefined,
        category: undefined,
      });
    });

    it('子ユーザーが自グループのタスク一覧を取得できること', async () => {
      mockTasksRepository.findAll.mockResolvedValue(mockTasks);

      const result = await service.findAll(groupId, childUser);

      expect(result).toEqual(mockTasks);
      expect(mockTasksRepository.findAll).toHaveBeenCalledWith({
        groupId,
        status: undefined,
        assigneeId: undefined,
        keyword: undefined,
        month: undefined,
        category: undefined,
      });
    });

    it('ステータス・担当者・キーワードフィルタを指定してタスク一覧を取得できること', async () => {
      mockTasksRepository.findAll.mockResolvedValue(mockTasks);

      const result = await service.findAll(
        groupId,
        parentUser,
        'pending',
        'child-user-id-001',
        '食器',
      );

      expect(result).toEqual(mockTasks);
      // フィルタが正しく渡されること
      expect(mockTasksRepository.findAll).toHaveBeenCalledWith({
        groupId,
        status: 'pending',
        assigneeId: 'child-user-id-001',
        keyword: '食器',
        month: undefined,
        category: undefined,
      });
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
      expect(mockTasksRepository.findAll).not.toHaveBeenCalled();
    });

    it('month フィルタを指定してタスク一覧を取得できること（FUN-TASK-005）', async () => {
      mockTasksRepository.findAll.mockResolvedValue(mockTasks);

      const result = await service.findAll(
        groupId,
        parentUser,
        undefined,
        undefined,
        undefined,
        '2026-05',
      );

      expect(result).toEqual(mockTasks);
      expect(mockTasksRepository.findAll).toHaveBeenCalledWith({
        groupId,
        status: undefined,
        assigneeId: undefined,
        keyword: undefined,
        month: '2026-05',
        category: undefined,
      });
    });

    it('category フィルタを指定してタスク一覧を取得できること（FUN-TASK-007）', async () => {
      // カテゴリでフィルタされたタスク一覧（掃除カテゴリのみ）
      const cleaningTask: Task = { ...mockTask, category: '掃除' };
      mockTasksRepository.findAll.mockResolvedValue([cleaningTask]);

      const result = await service.findAll(
        groupId,
        parentUser,
        undefined,
        undefined,
        undefined,
        undefined,
        '掃除',
      );

      expect(result).toEqual([cleaningTask]);
      // category フィルタが正しくリポジトリへ渡されること
      expect(mockTasksRepository.findAll).toHaveBeenCalledWith({
        groupId,
        status: undefined,
        assigneeId: undefined,
        keyword: undefined,
        month: undefined,
        category: '掃除',
      });
    });

    it('複数フィルタ（status・keyword・category）を組み合わせてタスク一覧を取得できること（FUN-TASK-007）', async () => {
      mockTasksRepository.findAll.mockResolvedValue(mockTasks);

      const result = await service.findAll(
        groupId,
        parentUser,
        'pending',
        undefined,
        '掃除',
        undefined,
        '料理',
      );

      expect(result).toEqual(mockTasks);
      // 全フィルタが正しくリポジトリへ渡されること
      expect(mockTasksRepository.findAll).toHaveBeenCalledWith({
        groupId,
        status: 'pending',
        assigneeId: undefined,
        keyword: '掃除',
        month: undefined,
        category: '料理',
      });
    });
  });

  // =========================================================================
  // updateTask
  // =========================================================================

  describe('updateTask', () => {
    const taskId = 'task-id-001';

    // タスク更新リクエスト DTO（一部フィールドのみ更新）
    const updateTaskDto: UpdateTaskDto = {
      taskName: '皿洗い',
      rewardAmount: 150,
    };

    // 更新後のタスクデータ
    const updatedMockTask: Task = {
      ...mockTask,
      task_name: '皿洗い',
      reward_amount: 150,
    };

    it('正常にタスクを更新できること', async () => {
      // リポジトリが更新後のタスクを返すよう設定
      mockTasksRepository.updateTask.mockResolvedValue(updatedMockTask);

      const result = await service.updateTask(taskId, updateTaskDto, parentUser);

      expect(result).toEqual(updatedMockTask);
      // 正しい引数でリポジトリが呼ばれること
      expect(mockTasksRepository.updateTask).toHaveBeenCalledWith(
        taskId,
        parentUser.family_group_id,
        {
          assignee_id: undefined,
          task_name: '皿洗い',
          category: undefined,
          reward_amount: 150,
          start_time: undefined,
          end_time: undefined,
          due_date: undefined,
          memo: undefined,
        },
      );
    });

    it('タスクが存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが null を返す（タスクが存在しないまたは他グループのタスク）
      mockTasksRepository.updateTask.mockResolvedValue(null);

      await expect(
        service.updateTask('non-existent-task-id', updateTaskDto, parentUser),
      ).rejects.toThrow(NotFoundException);

      // リポジトリは呼ばれること
      expect(mockTasksRepository.updateTask).toHaveBeenCalledWith(
        'non-existent-task-id',
        parentUser.family_group_id,
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // deleteTask
  // =========================================================================

  describe('deleteTask', () => {
    const taskId = 'task-id-001';

    it('正常にタスクを削除できること', async () => {
      // リポジトリが true を返す（削除成功）
      mockTasksRepository.deleteTask.mockResolvedValue(true);

      const result = await service.deleteTask(taskId, parentUser);

      expect(result).toEqual({ message: 'タスクを削除しました' });
      // 正しい引数でリポジトリが呼ばれること
      expect(mockTasksRepository.deleteTask).toHaveBeenCalledWith(
        taskId,
        parentUser.family_group_id,
      );
    });

    it('タスクが存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが false を返す（タスクが存在しないまたは他グループのタスク）
      mockTasksRepository.deleteTask.mockResolvedValue(false);

      await expect(service.deleteTask('non-existent-task-id', parentUser)).rejects.toThrow(
        NotFoundException,
      );

      // リポジトリは呼ばれること
      expect(mockTasksRepository.deleteTask).toHaveBeenCalledWith(
        'non-existent-task-id',
        parentUser.family_group_id,
      );
    });
  });

  // =========================================================================
  // updateTaskStatus
  // =========================================================================

  describe('updateTaskStatus', () => {
    const taskId = 'task-id-001';

    // pending 状態のタスク（デフォルト）
    const pendingTask: Task = { ...mockTask, status: 'pending' };
    // reported 状態のタスク
    const reportedTask: Task = { ...mockTask, status: 'reported' };
    // completed 状態のタスク
    const completedTask: Task = { ...mockTask, status: 'completed' };

    it('pending → reported を child が実行できること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'reported' };
      mockTasksRepository.findById.mockResolvedValue(pendingTask);
      mockTasksRepository.updateTaskStatus.mockResolvedValue({
        ...pendingTask,
        status: 'reported',
      });

      const result = await service.updateTaskStatus(taskId, dto, childUser);

      expect(result.status).toBe('reported');
      // 実行報告時に task_completions レコードが作成されること
      expect(mockTasksRepository.createTaskCompletion).toHaveBeenCalledWith(
        taskId,
        childUser.sub,
        mockTask.reward_amount,
      );
      expect(mockTasksRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        childUser.family_group_id,
        'reported',
      );
    });

    it('reported → completed を parent が承認できること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'completed' };
      mockTasksRepository.findById.mockResolvedValue(reportedTask);
      mockTasksRepository.updateTaskStatus.mockResolvedValue({
        ...reportedTask,
        status: 'completed',
      });

      const result = await service.updateTaskStatus(taskId, dto, parentUser);

      expect(result.status).toBe('completed');
      // 承認時に task_completions レコードが承認済みに更新されること
      expect(mockTasksRepository.approveTaskCompletion).toHaveBeenCalledWith(
        taskId,
        parentUser.sub,
      );
      expect(mockTasksRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        parentUser.family_group_id,
        'completed',
      );
    });

    it('reported → pending を parent が差し戻しできること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'pending', comment: '作業が不完全です' };
      mockTasksRepository.findById.mockResolvedValue(reportedTask);
      mockTasksRepository.updateTaskStatus.mockResolvedValue({
        ...reportedTask,
        status: 'pending',
      });

      const result = await service.updateTaskStatus(taskId, dto, parentUser);

      expect(result.status).toBe('pending');
      // 差し戻し時に task_completions レコードがソフトデリートされること
      expect(mockTasksRepository.cancelTaskCompletion).toHaveBeenCalledWith(taskId);
      expect(mockTasksRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        parentUser.family_group_id,
        'pending',
      );
    });

    it('pending → completed を parent が即時完了できること（assignee あり: task_completions を作成して即時承認）', async () => {
      const dto: UpdateTaskStatusDto = { status: 'completed' };
      mockTasksRepository.findById.mockResolvedValue(pendingTask);
      mockTasksRepository.updateTaskStatus.mockResolvedValue({
        ...pendingTask,
        status: 'completed',
      });

      const result = await service.updateTaskStatus(taskId, dto, parentUser);

      expect(result.status).toBe('completed');
      expect(mockTasksRepository.updateTaskStatus).toHaveBeenCalledWith(
        taskId,
        parentUser.family_group_id,
        'completed',
      );
      // 即時完了（assignee あり）: task_completions を作成して即時承認する
      expect(mockTasksRepository.createTaskCompletion).toHaveBeenCalledWith(
        taskId,
        pendingTask.assignee_id,
        pendingTask.reward_amount,
      );
      expect(mockTasksRepository.approveTaskCompletion).toHaveBeenCalledWith(taskId, parentUser.sub);
      expect(mockTasksRepository.cancelTaskCompletion).not.toHaveBeenCalled();
    });

    it('pending → completed を parent が即時完了するとき assignee なしなら task_completions 操作をしないこと', async () => {
      const dto: UpdateTaskStatusDto = { status: 'completed' };
      const taskWithoutAssignee: Task = { ...pendingTask, assignee_id: null };
      mockTasksRepository.findById.mockResolvedValue(taskWithoutAssignee);
      mockTasksRepository.updateTaskStatus.mockResolvedValue({
        ...taskWithoutAssignee,
        status: 'completed',
      });

      const result = await service.updateTaskStatus(taskId, dto, parentUser);

      expect(result.status).toBe('completed');
      // assignee がいないため task_completions は作成しない
      expect(mockTasksRepository.createTaskCompletion).not.toHaveBeenCalled();
      expect(mockTasksRepository.approveTaskCompletion).not.toHaveBeenCalled();
    });

    it('当月の報酬が paid 済みの場合、承認（reported → completed）で BadRequestException をスローすること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'completed' };
      mockTasksRepository.findById.mockResolvedValue(reportedTask);
      mockRewardsRepository.findByChildAndMonth.mockResolvedValue({ status: 'paid' });

      await expect(service.updateTaskStatus(taskId, dto, parentUser)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockTasksRepository.approveTaskCompletion).not.toHaveBeenCalled();
      expect(mockTasksRepository.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('当月の報酬が paid 済みの場合、即時完了で BadRequestException をスローすること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'completed' };
      mockTasksRepository.findById.mockResolvedValue(pendingTask);
      // 当月報酬が paid 済みをシミュレート
      mockRewardsRepository.findByChildAndMonth.mockResolvedValue({ status: 'paid' });

      await expect(service.updateTaskStatus(taskId, dto, parentUser)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockTasksRepository.createTaskCompletion).not.toHaveBeenCalled();
      expect(mockTasksRepository.approveTaskCompletion).not.toHaveBeenCalled();
      expect(mockTasksRepository.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('child が pending → completed を試みると ForbiddenException をスローすること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'completed' };
      mockTasksRepository.findById.mockResolvedValue(pendingTask);

      await expect(service.updateTaskStatus(taskId, dto, childUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockTasksRepository.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('pending → cancelled を child が取り下げできること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'cancelled' };
      mockTasksRepository.findById.mockResolvedValue(pendingTask);
      mockTasksRepository.updateTaskStatus.mockResolvedValue({
        ...pendingTask,
        status: 'cancelled',
      });

      const result = await service.updateTaskStatus(taskId, dto, childUser);

      expect(result.status).toBe('cancelled');
      // 取り下げ時に task_completions のソフトデリートが呼ばれること
      expect(mockTasksRepository.cancelTaskCompletion).toHaveBeenCalledWith(taskId);
    });

    it('reported → cancelled を child が取り下げできること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'cancelled' };
      mockTasksRepository.findById.mockResolvedValue(reportedTask);
      mockTasksRepository.updateTaskStatus.mockResolvedValue({
        ...reportedTask,
        status: 'cancelled',
      });

      const result = await service.updateTaskStatus(taskId, dto, childUser);

      expect(result.status).toBe('cancelled');
      // 取り下げ時に task_completions のソフトデリートが呼ばれること
      expect(mockTasksRepository.cancelTaskCompletion).toHaveBeenCalledWith(taskId);
    });

    it('completed からの遷移が BadRequestException をスローすること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'pending' };
      mockTasksRepository.findById.mockResolvedValue(completedTask);

      await expect(service.updateTaskStatus(taskId, dto, parentUser)).rejects.toThrow(
        BadRequestException,
      );

      // ステータス更新リポジトリは呼ばれないこと
      expect(mockTasksRepository.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('child が reported → completed を試みると ForbiddenException をスローすること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'completed' };
      mockTasksRepository.findById.mockResolvedValue(reportedTask);

      await expect(service.updateTaskStatus(taskId, dto, childUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockTasksRepository.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('parent が pending → reported を試みると ForbiddenException をスローすること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'reported' };
      mockTasksRepository.findById.mockResolvedValue(pendingTask);

      await expect(service.updateTaskStatus(taskId, dto, parentUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockTasksRepository.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('タスクが存在しない場合は NotFoundException をスローすること', async () => {
      const dto: UpdateTaskStatusDto = { status: 'reported' };
      // findById が null を返す（タスクが存在しないまたは他グループのタスク）
      mockTasksRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateTaskStatus('non-existent-task-id', dto, childUser),
      ).rejects.toThrow(NotFoundException);

      // 存在確認でエラーになるためステータス更新リポジトリは呼ばれないこと
      expect(mockTasksRepository.updateTaskStatus).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findById
  // =========================================================================

  describe('findById', () => {
    const taskId = 'task-id-001';

    it('正常にタスク詳細を取得できること', async () => {
      mockTasksRepository.findById.mockResolvedValue(mockTask);

      const result = await service.findById(taskId, parentUser);

      expect(result).toEqual(mockTask);
      // 正しい taskId と family_group_id でリポジトリが呼ばれること
      expect(mockTasksRepository.findById).toHaveBeenCalledWith(taskId, parentUser.family_group_id);
    });

    it('子ユーザーがタスク詳細を取得できること', async () => {
      mockTasksRepository.findById.mockResolvedValue(mockTask);

      const result = await service.findById(taskId, childUser);

      expect(result).toEqual(mockTask);
      expect(mockTasksRepository.findById).toHaveBeenCalledWith(taskId, childUser.family_group_id);
    });

    it('タスクが存在しない場合は NotFoundException をスロー', async () => {
      // リポジトリが null を返す（タスクが存在しないまたは他グループのタスク）
      mockTasksRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-task-id', parentUser)).rejects.toThrow(
        NotFoundException,
      );

      // リポジトリは呼ばれること
      expect(mockTasksRepository.findById).toHaveBeenCalledWith(
        'non-existent-task-id',
        parentUser.family_group_id,
      );
    });
  });
});
