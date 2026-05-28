import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { GroupMemberResponseDto } from './dto/group-member-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '@fambiz/types';

/**
 * 家族グループ管理コントローラー。
 * グループ作成・招待などのエンドポイントを提供する。
 * 全エンドポイントで JwtAuthGuard + RolesGuard を適用する。
 */
@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  /**
   * 家族グループを新規作成する（親のみ）。
   * 既にグループを持つ親が再度作成しようとした場合は 400 エラーを返す。
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('parent')
  @ApiOperation({ summary: '家族グループ作成（親のみ）' })
  @ApiResponse({ status: 201, description: 'グループ作成成功', type: GroupResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー / グループ重複' })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（子はアクセス不可）' })
  async createGroup(
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GroupResponseDto> {
    return this.familyService.createGroup(dto, user.sub);
  }

  /**
   * 家族グループのメンバー一覧を取得する（親・子どちらもアクセス可能）。
   * 自分が所属するグループ以外へのアクセスは 403 エラーを返す。
   */
  @Get(':groupId/members')
  @ApiOperation({ summary: '家族メンバー一覧取得（FUN-GROUP-002）' })
  @ApiResponse({ status: 200, description: 'メンバー一覧取得成功', type: [GroupMemberResponseDto] })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（他グループへのアクセス）' })
  @ApiResponse({ status: 404, description: 'グループが存在しない' })
  async findGroupMembers(
    @Param('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GroupMemberResponseDto[]> {
    return this.familyService.findGroupMembers(groupId, user);
  }

  /**
   * 家族グループの特定メンバー詳細を取得する（親・子どちらもアクセス可能）。
   * 自分が所属するグループ以外へのアクセスは 403 エラーを返す。
   */
  @Get(':groupId/members/:userId')
  @ApiOperation({ summary: '家族メンバー詳細取得（FUN-GROUP-003）' })
  @ApiResponse({ status: 200, description: 'メンバー詳細取得成功', type: GroupMemberResponseDto })
  @ApiResponse({ status: 401, description: '未認証' })
  @ApiResponse({ status: 403, description: '権限なし（他グループへのアクセス）' })
  @ApiResponse({ status: 404, description: 'メンバーが存在しない' })
  async findGroupMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GroupMemberResponseDto> {
    return this.familyService.findGroupMember(groupId, userId, user);
  }
}
