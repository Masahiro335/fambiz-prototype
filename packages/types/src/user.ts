import { UserRole } from './common';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserDto {
  name?: string;
  avatar_url?: string;
  comment?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
