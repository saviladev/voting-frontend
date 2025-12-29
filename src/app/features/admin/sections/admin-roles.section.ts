import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { PermissionDto, RoleDto } from '../../../core/models/rbac.models';
import { RbacService } from '../../../core/services/rbac.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-roles-section',
  standalone: true,
  templateUrl: 'admin-roles.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminRolesSection extends AdminListBase implements OnInit {
  roles = signal<RoleDto[]>([]);
  permissions = signal<PermissionDto[]>([]);

  roleFilter = signal('');
  rolePage = signal(0);

  editingRoleId: string | null = null;

  readonly roleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  readonly assignPermissionsForm = this.fb.nonNullable.group({
    roleId: ['', [Validators.required]],
    permissions: [[] as string[]],
  });

  readonly filteredRoles = computed(() =>
    this.filterBy(this.roles(), this.roleFilter(), (role) => `${role.name} ${role.description ?? ''}`),
  );

  readonly pagedRoles = computed(() => this.paginate(this.filteredRoles(), this.rolePage()));
  readonly rolePages = computed(() => this.pageCount(this.filteredRoles()));

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private rbacService: RbacService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await Promise.all([this.loadRoles(), this.loadPermissions()]);
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.roleFilter();
        this.rolePage.set(0);
      });
    });
  }

  async loadRoles() {
    this.roles.set(await firstValueFrom(this.rbacService.listRoles()));
  }

  async loadPermissions() {
    this.permissions.set(await firstValueFrom(this.rbacService.listPermissions()));
  }

  async saveRole() {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }
    const value = this.roleForm.getRawValue();
    if (this.editingRoleId) {
      await firstValueFrom(this.rbacService.updateRole(this.editingRoleId, value));
      await this.notify('Rol actualizado.');
    } else {
      await firstValueFrom(this.rbacService.createRole(value));
      await this.notify('Rol creado.');
    }
    this.resetRoleForm();
    await this.loadRoles();
  }

  editRole(role: RoleDto) {
    this.editingRoleId = role.id;
    this.roleForm.reset({ name: role.name, description: role.description ?? '' });
  }

  resetRoleForm() {
    this.editingRoleId = null;
    this.roleForm.reset({ name: '', description: '' });
  }

  async deleteRole(role: RoleDto) {
    if (!window.confirm(`Eliminar el rol ${role.name}?`)) {
      return;
    }
    await firstValueFrom(this.rbacService.deleteRole(role.id));
    await this.notify('Rol eliminado.');
    await this.loadRoles();
  }

  async replacePermissions() {
    if (this.assignPermissionsForm.invalid) {
      this.assignPermissionsForm.markAllAsTouched();
      return;
    }
    const value = this.assignPermissionsForm.getRawValue();
    await firstValueFrom(this.rbacService.replacePermissions(value.roleId, value.permissions));
    await this.notify('Permisos actualizados.');
    await this.loadRoles();
    this.assignPermissionsForm.reset({ roleId: '', permissions: [] });
  }
}
