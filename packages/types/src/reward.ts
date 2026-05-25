import { User } from './user';

export type RewardStatus = 'pending' | 'paid';

export interface Reward {
  id: string;
  group_id: string;
  child_id: string;
  target_month: string;
  task_reward_total: number;
  bonus_reward_total: number;
  total_amount: number;
  evaluation_score: number | null;
  evaluation_comment: string | null;
  status: RewardStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  child?: User;
}

export interface UpdateRewardDto {
  evaluation_score?: number;
  evaluation_comment?: string;
}

export interface PayRewardDto {
  paid_at?: string;
}
