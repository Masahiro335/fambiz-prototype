import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { RewardsRepository } from './rewards.repository';
import { JwtStrategy } from '../../shared/strategies/jwt.strategy';
import { RolesGuard } from '../../shared/guards/roles.guard';

/**
 * 報酬管理モジュール（FUN-REWARD-001〜005）。
 * 月次報酬集計・グラフ取得・評価登録・支払い完了・タスク完了履歴などを担う。
 */
@Module({
  imports: [
    // JWT ストラテジーを有効化
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [RewardsController],
  providers: [RewardsService, RewardsRepository, JwtStrategy, RolesGuard],
  exports: [RewardsService],
})
export class RewardsModule {}
