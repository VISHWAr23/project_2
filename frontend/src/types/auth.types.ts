export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  statusCode: number;
}
