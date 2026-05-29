import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { Task, JwtPayload } from '@fambiz/types';

// =========================================================================
// TasksRepository のモック
// =========================================================================

const mockTasksRepository = {
  createTask: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  updateTask: jest.fn(),
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
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    // 各テスト前にモックをリセット
    jest.clearAllMocks();
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
