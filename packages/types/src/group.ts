import { User } from './user';

export interface Group {
  id: string;
  group_name: string;
  invite_code: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface CreateGroupDto {
  group_name: string;
}

export interface JoinGroupDto {
  invite_code: string;
}
