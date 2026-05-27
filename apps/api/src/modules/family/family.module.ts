import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { FamilyRepository } from './family.repository';
import { JwtStrategy } from '../../shared/strategies/jwt.strategy';
import { RolesGuard } from '../../shared/guards/roles.guard';

/**
 * 家族グループ管理モジュール（FUN-GROUP-001〜006）。
 * グループ作成・招待コード発行・メンバー管理などを担う。
 */
@Module({
  imports: [
    // JWT ストラテジーを有効化
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyRepository, JwtStrategy, RolesGuard],
  exports: [FamilyService],
})
export class FamilyModule {}
