import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { User } from '@fambiz/types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfileUpdateDto } from './dto/profile-update.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  /**
   * DBクエリ専用クライアント（service_role、RLSバイパス）。
   * signInWithPassword を呼ばないことで auth 状態を service_role のまま維持する。
   */
  private readonly db: SupabaseClient<any>;

  /**
   * Auth操作専用クライアント（service_role）。
   * signInWithPassword / signOut / admin.createUser を担当。
   * signIn 後に auth 状態が変わっても db クライアントに影響しない。
   */
  private readonly supabase: SupabaseClient<any>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    const opts = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: WebSocket as any },
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.db = createClient(url, serviceRoleKey, opts);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.supabase = createClient(url, serviceRoleKey, opts);
  }

  /**
   * ユーザー登録処理。
   * 1. Supabase Admin API で auth.users にユーザーを作成（メール確認スキップ）
   * 2. public.users テーブルにプロフィールを挿入
   * 3. signInWithPassword で即座にサインインしてトークンを取得
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // 既存ユーザーの重複確認（public.users をチェック）
    const { data: existingUser } = await this.db
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .eq('deleted_flag', false)
      .maybeSingle();

    if (existingUser) {
      throw new BadRequestException('このメールアドレスはすでに使用されています');
    }

    // Supabase Admin API でauthユーザーを作成（email_confirm: true でメール確認スキップ）
    const { data: authData, error: createError } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        name: dto.name,
        role: dto.role,
      },
    });

    if (createError || !authData.user) {
      throw new BadRequestException(createError?.message ?? 'ユーザー登録に失敗しました');
    }

    const authUserId = authData.user.id;

    // public.users テーブルへのプロフィール挿入
    // （DB トリガーが既に作成している場合は ON CONFLICT DO NOTHING で安全に処理）
    const { error: profileError } = await this.db.from('users').upsert(
      {
        id: authUserId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      // プロフィール挿入失敗時は auth ユーザーを削除してロールバック
      await this.supabase.auth.admin.deleteUser(authUserId);
      throw new InternalServerErrorException('プロフィールの作成に失敗しました');
    }

    // 即座にサインインしてアクセストークンを取得
    const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (signInError || !signInData.session) {
      throw new InternalServerErrorException('サインインに失敗しました');
    }

    // public.users からプロフィール情報を取得
    const user = await this.getUserProfile(authUserId);

    return {
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      user,
    };
  }

  /**
   * ログイン処理。
   * Supabase Auth の signInWithPassword を使用してアクセストークンを発行する。
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    const user = await this.getUserProfile(data.user.id);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user,
    };
  }

  /**
   * ログアウト処理。
   * Supabase Admin API でサーバー側のセッションを無効化する。
   */
  async logout(userId: string): Promise<{ message: string }> {
    const { error } = await this.supabase.auth.admin.signOut(userId);

    if (error) {
      throw new InternalServerErrorException('ログアウトに失敗しました');
    }

    return { message: 'ログアウトしました' };
  }

  /**
   * 自分のプロフィール情報を取得する。
   * deleted_flag = true のユーザーは取得不可（削除済みとして扱う）。
   */
  async getMe(userId: string): Promise<User> {
    return this.getUserProfile(userId);
  }

  /**
   * 自分のプロフィール情報を更新する。
   * name / avatar_url / comment のみ更新可能。
   */
  async updateMe(userId: string, dto: ProfileUpdateDto): Promise<User> {
    // 更新データを構築（undefined のフィールドは除外）
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData['name'] = dto.name;
    if (dto.avatarUrl !== undefined) updateData['avatar_url'] = dto.avatarUrl;
    if (dto.comment !== undefined) updateData['comment'] = dto.comment;

    const { error } = await this.db
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .eq('deleted_flag', false);

    if (error) {
      throw new InternalServerErrorException('プロフィールの更新に失敗しました');
    }

    return this.getUserProfile(userId);
  }

  /**
   * アカウント削除処理（ソフトデリート）。
   * 1. public.users の deleted_flag を true に更新
   * 2. Supabase auth.users からも削除
   */
  async deleteMe(userId: string): Promise<{ message: string }> {
    // ソフトデリート: public.users の deleted_flag を true に更新
    const { error: updateError } = await this.db
      .from('users')
      .update({ deleted_flag: true })
      .eq('id', userId)
      .eq('deleted_flag', false);

    if (updateError) {
      throw new InternalServerErrorException('アカウントの削除に失敗しました');
    }

    // auth.users からもハード削除
    const { error: deleteAuthError } = await this.supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      throw new InternalServerErrorException('認証情報の削除に失敗しました');
    }

    return { message: 'アカウントを削除しました' };
  }

  /**
   * public.users テーブルからユーザープロフィールを取得するヘルパー。
   * deleted_flag = false のユーザーのみ取得可能。
   */
  private async getUserProfile(userId: string): Promise<User> {
    const { data, error } = await this.db
      .from('users')
      .select('id, email, name, role, avatar_url, comment, created_at, updated_at')
      .eq('id', userId)
      .eq('deleted_flag', false)
      .single();

    if (error || !data) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    return data;
  }
}
