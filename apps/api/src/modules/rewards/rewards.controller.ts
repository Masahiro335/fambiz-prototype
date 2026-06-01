import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { GetRewardQueryDto } from './dto/get-reward-query.dto';
import { GetRewardGraphQueryDto } from './dto/get-reward-graph-query.dto';
import { EvaluationRequestDto } from './dto/evaluation-request.dto';
import { RewardResponseDto, RewardGraphResponseDto } from './dto/reward-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload, TaskCompletion } from '@fambiz/types';

/**
 * 報酬管理コントローラー（FUN-REWARD-001〜005）。
 * 月次報酬集計・グラフ取得・評価登録・支払い完了・タスク完了履歴エンドポイントを提供する。
 * 全エンドポイントで JwtAuthGuard + RolesGuard を適用する。
 */
@ApiTags('rewards')
@Controller('rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  /**
   * 指定月の報酬集計を取得する（親・子どちらもアクセス可能）。
   * groupId パラメータが自分の所属グループと異なる場合は 403 エラーを返す。
   * status = 'pending' の場合は最新データで再計算してから返す。
   */
  @Get()
  @ApiOperation({ summary: '月次報酬集計取得（FUN-REWARD-001）' })
  @ApiQuery({ name: 'groupId', required: true, description: '家族グループID（UUID）' })
  @ApiQuery({ name: 'childId', required: true, description: '子ユーザーID（UUID）' })
  @ApiQuery({ name: 'targetMonth', required: true, description: '対象月（YYYY-MM形式）' })
  @ApiResponse({ status: 200, description: '報酬集計取得成功', type: RewardResponseDto })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（他グループへのアクセス）' })
  async getReward(
    @Query() query: GetRewardQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RewardResponseDto> {
    return this.rewardsService.getReward(query, user);
  }

  /**
   * 月次報酬グラフデータを取得する（親・子どちらもアクセス可能）。
   * groupId パラメータが自分の所属グループと異なる場合は 403 エラーを返す。
   */
  @Get('graph')
  @ApiOperation({ summary: '月次報酬グラフ取得（FUN-REWARD-002）' })
  @ApiQuery({ name: 'groupId', required: true, description: '家族グループID（UUID）' })
  @ApiQuery({ name: 'childId', required: true, description: '子ユーザーID（UUID）' })
  @ApiQuery({ name: 'targetMonth', required: true, description: '対象月（YYYY-MM形式）' })
  @ApiQuery({
    name: 'historyMonths',
    required: false,
    description: '履歴表示月数（デフォルト6、最大12）',
  })
  @ApiResponse({ status: 200, description: 'グラフデータ取得成功', type: RewardGraphResponseDto })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（他グループへのアクセス）' })
  async getRewardGraph(
    @Query() query: GetRewardGraphQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RewardGraphResponseDto> {
    return this.rewardsService.getRewardGraph(query, user);
  }

  /**
   * 報酬に評価スコアとコメントを登録する（親のみ）。
   * 他グループの報酬にアクセスしようとした場合は 404 エラーを返す。
   */
  @Post(':rewardId/evaluation')
  @HttpCode(HttpStatus.OK)
  @Roles('parent')
  @ApiOperation({ summary: '報酬評価登録（FUN-REWARD-003・親のみ）' })
  @ApiResponse({ status: 200, description: '評価登録成功', type: RewardResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可）' })
  @ApiResponse({ status: 404, description: '報酬が存在しない' })
  async registerEvaluation(
    @Param('rewardId') rewardId: string,
    @Body() dto: EvaluationRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RewardResponseDto> {
    return this.rewardsService.registerEvaluation(rewardId, dto, user);
  }

  /**
   * 報酬を支払い済みにマークする（親のみ）。
   * 既に paid の場合は 400 エラーを返す（二重支払い防止）。
   * 他グループの報酬にアクセスしようとした場合は 404 エラーを返す。
   */
  @Post(':rewardId/pay')
  @HttpCode(HttpStatus.OK)
  @Roles('parent')
  @ApiOperation({ summary: '報酬支払い完了（FUN-REWARD-004・親のみ）' })
  @ApiResponse({ status: 200, description: '支払い完了', type: RewardResponseDto })
  @ApiResponse({ status: 400, description: '既に支払い済み' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可）' })
  @ApiResponse({ status: 404, description: '報酬が存在しない' })
  async payReward(
    @Param('rewardId') rewardId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<RewardResponseDto> {
    return this.rewardsService.payReward(rewardId, user);
  }

  /**
   * 報酬に紐づくタスク完了履歴一覧を取得する（親・子どちらもアクセス可能）。
   * 他グループの報酬にアクセスしようとした場合は 404 エラーを返す。
   */
  @Get(':rewardId/completions')
  @ApiOperation({ summary: 'タスク完了履歴取得（FUN-REWARD-005）' })
  @ApiResponse({ status: 200, description: 'タスク完了履歴取得成功' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 404, description: '報酬が存在しない' })
  async getCompletions(
    @Param('rewardId') rewardId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskCompletion[]> {
    return this.rewardsService.getCompletions(rewardId, user);
  }
}
