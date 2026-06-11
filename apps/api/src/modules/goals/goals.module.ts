import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { GoalsRepository } from './goals.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { JwtStrategy } from '../../shared/strategies/jwt.strategy';
import { RolesGuard } from '../../shared/guards/roles.guard';

/**
 * 目標管理モジュール（FUN-GOAL-001〜005）。
 * 目標の作成・一覧取得・詳細取得・更新・削除・ステータス遷移などを担う。
 */
@Module({
  imports: [
    // JWT ストラテジーを有効化
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [GoalsController],
  providers: [GoalsService, GoalsRepository, TasksRepository, JwtStrategy, RolesGuard],
  exports: [GoalsService],
})
export class GoalsModule {}
