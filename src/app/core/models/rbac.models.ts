export interface PermissionDto {
  id: string;
  key: string;
  description?: string | null;
}

export interface RolePermissionDto {
  permission: PermissionDto;
}

export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  permissions: RolePermissionDto[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface CreatePermissionDto {
  key: string;
  description?: string;
}

export interface UserRoleDto {
  role: {
    id: string;
    name: string;
  };
}

export interface AdminUserDto {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isActive: boolean;
  chapter?: {
    id: string;
    name: string;
    branch?: {
      id: string;
      name: string;
      association?: { id: string; name: string };
    };
    specialties?: {
      specialty?: { id: string; name: string };
    }[];
  } | null;
  roles: UserRoleDto[];
}

export interface CreateUserDto {
  dni: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  chapterId: string;
  roles?: string[];
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  chapterId?: string;
  password?: string;
  isActive?: boolean;
  roles?: string[];
}
