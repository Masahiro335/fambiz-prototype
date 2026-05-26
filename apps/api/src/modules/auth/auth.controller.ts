import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfileUpdateDto } from './dto/profile-update.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload, User } from '@fambiz/types';

/**
 * 認証・アカウント管理コントローラー。
 * register / login は認証不要。それ以外は JwtAuthGuard が必要。
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ユーザー登録（認証不要）。
   * Supabase Auth にユーザーを作成し、即座にトークンを返す。
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'ユーザー登録' })
  @ApiResponse({ status: 201, description: '登録成功', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー / メールアドレス重複' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * ログイン（認証不要）。
   * Supabase Auth で認証し、アクセストークンを返す。
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログイン' })
  @ApiResponse({ status: 200, description: 'ログイン成功', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: '認証失敗' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * ログアウト（JWT必須）。
   * サーバー側でセッションを無効化する。
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ログアウト' })
  @ApiResponse({ status: 200, description: 'ログアウト成功' })
  @ApiResponse({ status: 401, description: '未認証' })
  async logout(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    return this.authService.logout(user.sub);
  }

  /**
   * 自分のプロフィール取得（JWT必須）。
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '自分のプロフィール取得' })
  @ApiResponse({ status: 200, description: 'プロフィール取得成功' })
  @ApiResponse({ status: 401, description: '未認証' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<User> {
    return this.authService.getMe(user.sub);
  }

  /**
   * 自分のプロフィール更新（JWT必須）。
   * name / avatarUrl / comment のみ更新可能。
   */
  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '自分のプロフィール更新' })
  @ApiResponse({ status: 200, description: 'プロフィール更新成功' })
  @ApiResponse({ status: 401, description: '未認証' })
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: ProfileUpdateDto): Promise<User> {
    return this.authService.updateMe(user.sub, dto);
  }

  /**
   * アカウント削除（JWT必須）。
   * ソフトデリートと auth ユーザーの削除を行う。
   */
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'アカウント削除' })
  @ApiResponse({ status: 200, description: '削除成功' })
  @ApiResponse({ status: 401, description: '未認証' })
  async deleteMe(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    return this.authService.deleteMe(user.sub);
  }
}
