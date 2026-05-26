import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '../../shared/strategies/jwt.strategy';
import { RolesGuard } from '../../shared/guards/roles.guard';

/**
 * 認証モジュール。
 * PassportModule と JwtStrategy を組み合わせて Supabase JWT を検証する。
 * RolesGuard はコントローラーでインスタンス注入するため exports に含める。
 */
@Module({
  imports: [
    // JWT ストラテジーを有効化
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
  ],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
