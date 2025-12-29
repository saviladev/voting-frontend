export interface AuthUser {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  chapterId?: string | null;
  roles: string[];
  permissions: string[];
}

export interface LoginResponseDto {
  accessToken: string;
  userId: string;
  user: AuthUser;
}

export interface LoginDto {
  dni: string;
  password: string;
}
