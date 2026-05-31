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
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateGoalStatusDto } from './dto/update-goal-status.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '@fambiz/types';

/**
 * 目標管理コントローラー（FUN-GOAL-001〜005）。
 * 目標の作成・一覧取得・詳細取得・更新・削除・ステータス変更エンドポイントを提供する。
 * 全エンドポイントで JwtAuthGuard + RolesGuard を適用する。
 */
@ApiTags('goals')
@Controller('goals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  /**
   * 目標一覧を取得する（親・子どちらもアクセス可能）。
   * groupId パラメータが自分の所属グループと異なる場合は 403 エラーを返す。
   */
  @Get()
  @ApiOperation({ summary: '目標一覧取得（FUN-GOAL-001）' })
  @ApiQuery({ name: 'groupId', required: true, description: '家族グループID（UUID）' })
  @ApiQuery({
    name: 'targetMonth',
    required: false,
    description: '対象月フィルタ（YYYY-MM形式）',
  })
  @ApiResponse({ status: 200, description: '目標一覧取得成功', type: [GoalResponseDto] })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（他グループへのアクセス）' })
  async findAll(
    @Query('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
    @Query('targetMonth') targetMonth?: string,
  ): Promise<GoalResponseDto[]> {
    return this.goalsService.findAll(groupId, user, targetMonth);
  }

  /**
   * 目標IDで特定の目標詳細を取得する（親・子どちらもアクセス可能）。
   * 他グループの目標にアクセスしようとした場合は 404 エラーを返す。
   */
  @Get(':goalId')
  @ApiOperation({ summary: '目標詳細取得（FUN-GOAL-002）' })
  @ApiResponse({ status: 200, description: '目標詳細取得成功', type: GoalResponseDto })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 404, description: '目標が存在しない' })
  async findById(
    @Param('goalId') goalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GoalResponseDto> {
    return this.goalsService.findById(goalId, user);
  }

  /**
   * 目標を新規作成する（親のみ）。
   * リクエストの groupId が自分の所属グループと異なる場合は 403 エラーを返す。
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('parent')
  @ApiOperation({ summary: '目標作成（FUN-GOAL-003・親のみ）' })
  @ApiResponse({ status: 201, description: '目標作成成功', type: GoalResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可・他グループへの操作）' })
  async createGoal(
    @Body() dto: CreateGoalDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GoalResponseDto> {
    return this.goalsService.createGoal(dto, user);
  }

  /**
   * 目標を更新する（親のみ）。
   * 他グループの目標にアクセスしようとした場合は 404 エラーを返す。
   */
  @Put(':goalId')
  @Roles('parent')
  @ApiOperation({ summary: '目標更新（FUN-GOAL-003 編集・親のみ）' })
  @ApiResponse({ status: 200, description: '目標更新成功', type: GoalResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可）' })
  @ApiResponse({ status: 404, description: '目標が存在しない' })
  async updateGoal(
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GoalResponseDto> {
    return this.goalsService.updateGoal(goalId, dto, user);
  }

  /**
   * 目標をソフトデリートする（親のみ）。
   * 他グループの目標にアクセスしようとした場合は 404 エラーを返す。
   */
  @Delete(':goalId')
  @HttpCode(HttpStatus.OK)
  @Roles('parent')
  @ApiOperation({ summary: '目標削除（FUN-GOAL-004・親のみ）' })
  @ApiResponse({ status: 200, description: '目標削除成功' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可）' })
  @ApiResponse({ status: 404, description: '目標が存在しない' })
  async deleteGoal(
    @Param('goalId') goalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.goalsService.deleteGoal(goalId, user);
  }

  /**
   * 目標のステータスを変更する（FUN-GOAL-005）。
   * 親・子どちらもアクセスできるが、遷移内容によってサービス層でロール制御を行う。
   */
  @Patch(':goalId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '目標ステータス変更（FUN-GOAL-005）' })
  @ApiResponse({ status: 200, description: 'ステータス変更成功', type: GoalResponseDto })
  @ApiResponse({ status: 400, description: 'ステータス遷移が不正' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: 'ロール違反' })
  @ApiResponse({ status: 404, description: '目標が存在しない' })
  async updateGoalStatus(
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GoalResponseDto> {
    return this.goalsService.updateGoalStatus(goalId, dto, user);
  }
}
