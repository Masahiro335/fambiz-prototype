import { User } from './user';

export type GoalStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_approval'
  | 'achieved'
  | 'failed';

export interface Goal {
  id: string;
  group_id: string;
  creator_id: string;
  assignee_id: string | null;
  task_id: string | null;
  goal_name: string;
  goal_reward: number;
  target_count: number | null;
  action: string | null;
  and_condition_flag: boolean;
  status: GoalStatus;
  target_month: string;
  created_at: string;
  updated_at: string;
  creator?: User;
  assignee?: User;
}

export interface CreateGoalDto {
  goal_name: string;
  goal_reward: number;
  target_month: string;
  assignee_id?: string;
  task_id?: string;
  target_count?: number;
  action?: string;
  and_condition_flag?: boolean;
}

export interface UpdateGoalDto {
  goal_name?: string;
  goal_reward?: number;
  assignee_id?: string;
  task_id?: string;
  target_count?: number;
  action?: string;
  and_condition_flag?: boolean;
}
