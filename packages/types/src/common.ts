export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  family_group_id: string;
  iat?: number;
  exp?: number;
}

export type UserRole = 'parent' | 'child';
