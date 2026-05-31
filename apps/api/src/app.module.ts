import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { FamilyModule } from './modules/family/family.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { GoalsModule } from './modules/goals/goals.module';

@Module({
  imports: [
    // 環境変数の設定（グローバルで利用可能にする）
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    // 認証モジュール（FUN-AUTH-001〜007）
    AuthModule,
    // 家族グループ管理モジュール（FUN-GROUP-001〜006）
    FamilyModule,
    // タスク管理モジュール（FUN-TASK-001〜007）
    TasksModule,
    // 目標管理モジュール（FUN-GOAL-001〜005）
    GoalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
