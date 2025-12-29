import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminUserDto,
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  PermissionDto,
  RoleDto,
  UpdateUserDto,
} from '../models/rbac.models';

@Injectable({ providedIn: 'root' })
export class RbacService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  listRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${this.apiBaseUrl}/rbac/roles`);
  }

  listPermissions(): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.apiBaseUrl}/rbac/permissions`);
  }

  listUsers(): Observable<AdminUserDto[]> {
    return this.http.get<AdminUserDto[]>(`${this.apiBaseUrl}/rbac/users`);
  }

  createUser(dto: CreateUserDto): Observable<AdminUserDto> {
    return this.http.post<AdminUserDto>(`${this.apiBaseUrl}/rbac/users`, dto);
  }

  updateUser(userId: string, dto: UpdateUserDto): Observable<AdminUserDto> {
    return this.http.put<AdminUserDto>(`${this.apiBaseUrl}/rbac/users/${userId}`, dto);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/rbac/users/${userId}`);
  }

  createRole(dto: CreateRoleDto): Observable<RoleDto> {
    return this.http.post<RoleDto>(`${this.apiBaseUrl}/rbac/roles`, dto);
  }

  updateRole(roleId: string, dto: CreateRoleDto): Observable<RoleDto> {
    return this.http.patch<RoleDto>(`${this.apiBaseUrl}/rbac/roles/${roleId}`, dto);
  }

  deleteRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/rbac/roles/${roleId}`);
  }

  createPermission(dto: CreatePermissionDto): Observable<PermissionDto> {
    return this.http.post<PermissionDto>(`${this.apiBaseUrl}/rbac/permissions`, dto);
  }

  updatePermission(permissionId: string, dto: CreatePermissionDto): Observable<PermissionDto> {
    return this.http.patch<PermissionDto>(`${this.apiBaseUrl}/rbac/permissions/${permissionId}`, dto);
  }

  deletePermission(permissionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/rbac/permissions/${permissionId}`);
  }

  assignPermissions(roleId: string, permissions: string[]): Observable<RoleDto> {
    return this.http.post<RoleDto>(`${this.apiBaseUrl}/rbac/roles/${roleId}/permissions`, {
      permissions,
    });
  }

  replacePermissions(roleId: string, permissions: string[]): Observable<RoleDto> {
    return this.http.put<RoleDto>(`${this.apiBaseUrl}/rbac/roles/${roleId}/permissions`, {
      permissions,
    });
  }

  assignRolesToUserByDni(dni: string, roles: string[]): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/rbac/users/by-dni/${dni}/roles`, {
      roles,
    });
  }

  replaceRolesForUserByDni(dni: string, roles: string[]): Observable<void> {
    return this.http.put<void>(`${this.apiBaseUrl}/rbac/users/by-dni/${dni}/roles`, {
      roles,
    });
  }
}
