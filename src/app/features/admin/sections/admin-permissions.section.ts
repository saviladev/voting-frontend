import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { PermissionDto } from '../../../core/models/rbac.models';
import { RbacService } from '../../../core/services/rbac.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-permissions-section',
  standalone: true,
  templateUrl: 'admin-permissions.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminPermissionsSection extends AdminListBase implements OnInit {
  permissions = signal<PermissionDto[]>([]);

  permissionFilter = signal('');
  permissionPage = signal(0);
  editingPermissionId: string | null = null;

  readonly permissionForm = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  readonly filteredPermissions = computed(() =>
    this.filterBy(
      this.permissions(),
      this.permissionFilter(),
      (permission) => `${permission.key} ${permission.description ?? ''}`,
    ),
  );

  readonly pagedPermissions = computed(() =>
    this.paginate(this.filteredPermissions(), this.permissionPage()),
  );
  readonly permissionPages = computed(() => this.pageCount(this.filteredPermissions()));

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
    await this.loadPermissions();
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.permissionFilter();
        this.permissionPage.set(0);
      });
    });
  }

  async loadPermissions() {
    this.permissions.set(await firstValueFrom(this.rbacService.listPermissions()));
  }

  async savePermission() {
    if (this.permissionForm.invalid) {
      this.permissionForm.markAllAsTouched();
      return;
    }
    const value = this.permissionForm.getRawValue();
    if (this.editingPermissionId) {
      await firstValueFrom(this.rbacService.updatePermission(this.editingPermissionId, value));
      await this.notify('Permiso actualizado.');
    } else {
      await firstValueFrom(this.rbacService.createPermission(value));
      await this.notify('Permiso creado.');
    }
    this.resetPermissionForm();
    await this.loadPermissions();
  }

  editPermission(permission: PermissionDto) {
    this.editingPermissionId = permission.id;
    this.permissionForm.reset({ key: permission.key, description: permission.description ?? '' });
  }

  resetPermissionForm() {
    this.editingPermissionId = null;
    this.permissionForm.reset({ key: '', description: '' });
  }

  async deletePermission(permission: PermissionDto) {
    if (!window.confirm(`Eliminar el permiso ${permission.key}?`)) {
      return;
    }
    await firstValueFrom(this.rbacService.deletePermission(permission.id));
    await this.notify('Permiso eliminado.');
    await this.loadPermissions();
  }
}
