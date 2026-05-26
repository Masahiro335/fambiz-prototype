import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfileUpdateDto } from './dto/profile-update.dto';

// =========================================================================
// Supabase クライアントのモック設定
// =========================================================================

// 読み取り系クエリビルダー（select → eq → eq → single/maybeSingle）のモック
const createReadBuilder = (resolvedValue: unknown) => {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(resolvedValue),
    single: jest.fn().mockResolvedValue(resolvedValue),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
};

// 更新系クエリビルダー（update → eq → eq → await）のモック
// 最後の .eq() が Promise を返すようにする
const createUpdateBuilder = (resolvedValue: unknown) => {
  let eqCallCount = 0;
  const builder: Record<string, jest.Mock> = {
    update: jest.fn(),
    eq: jest.fn().mockImplementation(() => {
      eqCallCount++;
      // 2回目の .eq() 呼び出し時に Promise を返す（await される終端）
      if (eqCallCount >= 2) {
        return Promise.resolve(resolvedValue);
      }
      return builder;
    }),
  };
  builder.update.mockReturnValue(builder);
  return builder;
};

// upsert ビルダー（from → upsert → await）のモック
const createUpsertBuilder = (resolvedValue: unknown) => ({
  upsert: jest.fn().mockResolvedValue(resolvedValue),
});

// Supabase Admin API のモック
const mockAdminApi = {
  createUser: jest.fn(),
  signOut: jest.fn(),
  deleteUser: jest.fn(),
};

// Supabase auth のモック
const mockAuth = {
  admin: mockAdminApi,
  signInWithPassword: jest.fn(),
};

// Supabase クライアントの from モック（呼び出しごとに異なる値を返せるよう jest.fn()）
const mockFrom = jest.fn();
const mockSupabaseClient = {
  from: mockFrom,
  auth: mockAuth,
};

// createClient のモック差し替え
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// =========================================================================
// テスト本体
// =========================================================================

describe('AuthService', () => {
  let service: AuthService;

  // テスト用ユーザーデータ
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'テストユーザー',
    role: 'parent' as const,
    avatar_url: null,
    comment: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                SUPABASE_URL: 'https://test.supabase.co',
                SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  it('サービスが正常に生成されること', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // register
  // =========================================================================

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      password: 'password123',
      name: '新規ユーザー',
      role: 'parent',
    };

    it('正常に登録できること', async () => {
      // 1回目: 重複チェック → 存在しない
      const checkBuilder = createReadBuilder({ data: null, error: null });
      // 2回目: upsert → 成功
      const upsertBuilder = createUpsertBuilder({ error: null });
      // 3回目: getUserProfile → ユーザーデータを返す
      const profileBuilder = createReadBuilder({ data: mockUser, error: null });

      mockFrom
        .mockReturnValueOnce(checkBuilder)
        .mockReturnValueOnce(upsertBuilder)
        .mockReturnValueOnce(profileBuilder);

      mockAdminApi.createUser.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      });

      mockAuth.signInWithPassword.mockResolvedValue({
        data: {
          session: mockSession,
          user: { id: 'new-user-id' },
        },
        error: null,
      });

      const result = await service.register(registerDto);

      expect(result).toMatchObject({
        accessToken: mockSession.access_token,
        refreshToken: mockSession.refresh_token,
        user: mockUser,
      });
    });

    it('メールアドレスが重複している場合は BadRequestException をスロー', async () => {
      // 既存ユーザーが存在する
      const checkBuilder = createReadBuilder({ data: { id: 'existing-id' }, error: null });
      mockFrom.mockReturnValue(checkBuilder);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('auth ユーザー作成失敗時は BadRequestException をスロー', async () => {
      // 重複チェック: 存在しない
      const checkBuilder = createReadBuilder({ data: null, error: null });
      mockFrom.mockReturnValue(checkBuilder);

      mockAdminApi.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'ユーザー作成失敗' },
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // login
  // =========================================================================

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('正常にログインできること', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: {
          session: mockSession,
          user: { id: mockUser.id },
        },
        error: null,
      });

      const profileBuilder = createReadBuilder({ data: mockUser, error: null });
      mockFrom.mockReturnValue(profileBuilder);

      const result = await service.login(loginDto);

      expect(result).toMatchObject({
        accessToken: mockSession.access_token,
        refreshToken: mockSession.refresh_token,
        user: mockUser,
      });
    });

    it('認証失敗時は UnauthorizedException をスロー', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // logout
  // =========================================================================

  describe('logout', () => {
    it('正常にログアウトできること', async () => {
      mockAdminApi.signOut.mockResolvedValue({ error: null });

      const result = await service.logout(mockUser.id);

      expect(result).toEqual({ message: 'ログアウトしました' });
      expect(mockAdminApi.signOut).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // =========================================================================
  // getMe
  // =========================================================================

  describe('getMe', () => {
    it('プロフィールを取得できること', async () => {
      const profileBuilder = createReadBuilder({ data: mockUser, error: null });
      mockFrom.mockReturnValue(profileBuilder);

      const result = await service.getMe(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('ユーザーが存在しない場合は NotFoundException をスロー', async () => {
      const profileBuilder = createReadBuilder({ data: null, error: { message: 'not found' } });
      mockFrom.mockReturnValue(profileBuilder);

      await expect(service.getMe('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // updateMe
  // =========================================================================

  describe('updateMe', () => {
    it('プロフィールを更新できること', async () => {
      const updateDto: ProfileUpdateDto = { name: '新しい名前' };
      const updatedUser = { ...mockUser, name: '新しい名前' };

      // update().eq('id', ...).eq('deleted_flag', ...) → { error: null }
      const updateBuilder = createUpdateBuilder({ error: null });
      // getUserProfile 用
      const profileBuilder = createReadBuilder({ data: updatedUser, error: null });

      mockFrom
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(profileBuilder);

      const result = await service.updateMe(mockUser.id, updateDto);

      expect(result).toEqual(updatedUser);
    });
  });

  // =========================================================================
  // deleteMe
  // =========================================================================

  describe('deleteMe', () => {
    it('アカウントを削除できること', async () => {
      // update().eq('id', ...).eq('deleted_flag', ...) → { error: null }
      const updateBuilder = createUpdateBuilder({ error: null });
      mockFrom.mockReturnValue(updateBuilder);

      mockAdminApi.deleteUser.mockResolvedValue({ error: null });

      const result = await service.deleteMe(mockUser.id);

      expect(result).toEqual({ message: 'アカウントを削除しました' });
      expect(mockAdminApi.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
