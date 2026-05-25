import { User } from './user';

export type TaskStatus = 'pending' | 'reported' | 'completed' | 'cancelled' | 'expired';

export interface Task {
  id: string;
  group_id: string;
  creator_id: string;
  assignee_id: string | null;
  task_name: string;
  category: string | null;
  reward_amount: number;
  status: TaskStatus;
  start_time: string | null;
  end_time: string | null;
  due_date: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  creator?: User;
  assignee?: User;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  child_id: string;
  reported_at: string;
  approved_by: string | null;
  approved_at: string | null;
  confirmed_reward: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  task_name: string;
  category?: string;
  reward_amount: number;
  assignee_id?: string;
  due_date?: string;
  memo?: string;
}

export interface UpdateTaskDto {
  task_name?: string;
  category?: string;
  reward_amount?: number;
  assignee_id?: string;
  due_date?: string;
  memo?: string;
}

export interface ReportTaskDto {
  start_time?: string;
  end_time?: string;
}

export interface ApproveTaskDto {
  confirmed_reward?: number;
}
