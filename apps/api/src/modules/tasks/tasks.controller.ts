import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload, TaskStatus } from '@fambiz/types';

/**
 * タスク管理コントローラー（FUN-TASK-001）。
 * タスクの作成・一覧取得・詳細取得エンドポイントを提供する。
 * 全エンドポイントで JwtAuthGuard + RolesGuard を適用する。
 */
@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * タスクを新規作成する（親のみ）。
   * リクエストの groupId が自分の所属グループと異なる場合は 403 エラーを返す。
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('parent')
  @ApiOperation({ summary: 'タスク作成（FUN-TASK-001・親のみ）' })
  @ApiResponse({ status: 201, description: 'タスク作成成功', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可・他グループへの操作）' })
  async createTask(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskResponseDto> {
    return this.tasksService.createTask(dto, user);
  }

  /**
   * タスクを更新する（親のみ）。
   * 他グループのタスクにアクセスしようとした場合は 404 エラーを返す。
   */
  @Put(':taskId')
  @Roles('parent')
  @ApiOperation({ summary: 'タスク更新（FUN-TASK-002・親のみ）' })
  @ApiResponse({ status: 200, description: 'タスク更新成功', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可）' })
  @ApiResponse({ status: 404, description: 'タスクが存在しない' })
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskResponseDto> {
    return this.tasksService.updateTask(taskId, dto, user);
  }

  /**
   * タスクをソフトデリートする（親のみ）。
   * 他グループのタスクにアクセスしようとした場合は 404 エラーを返す。
   */
  @Delete(':taskId')
  @HttpCode(HttpStatus.OK)
  @Roles('parent')
  @ApiOperation({ summary: 'タスク削除（FUN-TASK-003・親のみ）' })
  @ApiResponse({ status: 200, description: 'タスク削除成功' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可）' })
  @ApiResponse({ status: 404, description: 'タスクが存在しない' })
  async deleteTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.tasksService.deleteTask(taskId, user);
  }

  /**
   * タスクのステータスを変更する（FUN-TASK-004）。
   * 親・子どちらもアクセスできるが、遷移内容によってサービス層でロール制御を行う。
   */
  @Patch(':taskId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'タスクステータス変更（FUN-TASK-004）' })
  @ApiResponse({ status: 200, description: 'ステータス変更成功', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'ステータス遷移が不正' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: 'ロール違反' })
  @ApiResponse({ status: 404, description: 'タスクが存在しない' })
  async updateTaskStatus(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskResponseDto> {
    return this.tasksService.updateTaskStatus(taskId, dto, user);
  }

  /**
   * タスク一覧を取得する（親・子どちらもアクセス可能）。
   * groupId パラメータが自分の所属グループと異なる場合は 403 エラーを返す。
   */
  @Get()
  @ApiOperation({ summary: 'タスク一覧取得（FUN-TASK-001）' })
  @ApiQuery({ name: 'groupId', required: true, description: '家族グループID（UUID）' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'タスクステータスフィルタ',
    enum: ['pending', 'reported', 'completed', 'cancelled', 'expired'],
  })
  @ApiQuery({ name: 'assigneeId', required: false, description: '担当者ユーザーID（UUID）' })
  @ApiQuery({ name: 'keyword', required: false, description: 'キーワード検索（タスク名部分一致）' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'カレンダー表示用の対象月（YYYY-MM・FUN-TASK-005）',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'カテゴリフィルタ（掃除/料理/洗濯/その他）',
  })
  @ApiResponse({ status: 200, description: 'タスク一覧取得成功', type: [TaskResponseDto] })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（他グループへのアクセス）' })
  async findAll(
    @Query('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('keyword') keyword?: string,
    @Query('month') month?: string,
    @Query('category') category?: string,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.findAll(groupId, user, status, assigneeId, keyword, month, category);
  }

  /**
   * タスクIDで特定のタスク詳細を取得する（親・子どちらもアクセス可能）。
   * 他グループのタスクにアクセスしようとした場合は 404 エラーを返す。
   */
  @Get(':taskId')
  @ApiOperation({ summary: 'タスク詳細取得（FUN-TASK-001）' })
  @ApiResponse({ status: 200, description: 'タスク詳細取得成功', type: TaskResponseDto })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 404, description: 'タスクが存在しない' })
  async findById(
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findById(taskId, user);
  }
}
