import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { JwtStrategy } from '../../shared/strategies/jwt.strategy';
import { RolesGuard } from '../../shared/guards/roles.guard';

/**
 * タスク管理モジュール（FUN-TASK-001〜007）。
 * タスクの作成・一覧取得・詳細取得・ステータス遷移・承認などを担う。
 */
@Module({
  imports: [
    // JWT ストラテジーを有効化
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, JwtStrategy, RolesGuard],
  exports: [TasksService],
})
export class TasksModule {}
