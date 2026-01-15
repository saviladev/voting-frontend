import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import {
  AssociationDto,
  BranchDto,
  ChapterDto,
} from '../../../core/models/structure.models';
import { AdminUserDto, RoleDto } from '../../../core/models/rbac.models';
import { AssociationsService } from '../../../core/services/associations.service';
import { BranchesService } from '../../../core/services/branches.service';
import { ChaptersService } from '../../../core/services/chapters.service';
import { RbacService } from '../../../core/services/rbac.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-users-section',
  standalone: true,
  templateUrl: 'admin-users.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminUsersSection extends AdminListBase implements OnInit {
  users = signal<AdminUserDto[]>([]);
  roles = signal<RoleDto[]>([]);
  associations = signal<AssociationDto[]>([]);
  branches = signal<BranchDto[]>([]);
  chapters = signal<ChapterDto[]>([]);

  userFilter = signal('');
  userStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  userChapterFilter = signal('');
  userPage = signal(0);

  editingUserId: string | null = null;

  readonly userForm = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    password: ['', [Validators.minLength(8)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.required, Validators.email]],
    associationId: [''],
    branchId: this.fb.nonNullable.control({ value: '', disabled: true }),
    chapterId: this.fb.nonNullable.control({ value: '', disabled: true }, [
      Validators.required,
    ]),
    roles: [[] as string[]],
    isActive: [true],
  });

  readonly filteredUsers = computed(() =>
    this.users()
      .filter((user) => {
        const status = this.userStatusFilter();
        if (status === 'ACTIVE' && !user.isActive) {
          return false;
        }
        if (status === 'INACTIVE' && user.isActive) {
          return false;
        }
        const chapterId = this.userChapterFilter();
        if (chapterId && user.chapter?.id !== chapterId) {
          return false;
        }
        return true;
      })
      .filter((user) =>
        this.matchesTerm(
          this.userFilter(),
          `${user.dni} ${user.firstName} ${user.lastName} ${user.email ?? ''}`
        )
      )
  );

  readonly pagedUsers = computed(() =>
    this.paginate(this.filteredUsers(), this.userPage())
  );
  readonly userPages = computed(() => this.pageCount(this.filteredUsers()));

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private rbacService: RbacService,
    private associationsService: AssociationsService,
    private branchesService: BranchesService,
    private chaptersService: ChaptersService,
    toastController: ToastController
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await Promise.all([
      this.loadUsers(),
      this.loadAssociations(),
      this.loadBranches(),
      this.loadChapters(),
      this.loadRoles(),
    ]);
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.userFilter();
        this.userStatusFilter();
        this.userChapterFilter();
        this.userPage.set(0);
      });
    });
  }

  async loadUsers() {
    this.users.set(await firstValueFrom(this.rbacService.listUsers()));
  }

  async loadRoles() {
    this.roles.set(await firstValueFrom(this.rbacService.listRoles()));
  }

  async loadAssociations() {
    this.associations.set(
      await firstValueFrom(this.associationsService.list())
    );
  }

  async loadBranches() {
    this.branches.set(await firstValueFrom(this.branchesService.list()));
  }

  async loadChapters() {
    this.chapters.set(await firstValueFrom(this.chaptersService.list()));
  }

  async saveUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.userForm.updateValueAndValidity({ emitEvent: false });
      const missing = Object.entries(this.userForm.controls)
        .filter(([, control]) => control.invalid && !control.disabled)
        .map(([key]) => {
          switch (key) {
            case 'dni':
              return 'DNI';
            case 'password':
              return 'Contraseña';
            case 'firstName':
              return 'Nombres';
            case 'lastName':
              return 'Apellidos';
            case 'phone':
              return 'Teléfono';
            case 'email':
              return 'Email';
            case 'chapterId':
              return 'Capítulo';
            default:
              return key;
          }
        });
      const message =
        missing.length > 0
          ? `Campos incompletos: ${missing.join(', ')}.`
          : 'Completa los campos requeridos antes de continuar.';
      await this.notify(message, 'warning');
      return;
    }

    const value = this.userForm.getRawValue();
    if (!value.chapterId) {
      await this.notify('Selecciona un capítulo para el usuario.', 'warning');
      return;
    }
    if (!this.editingUserId && !value.password) {
      await this.notify(
        'La contraseña es obligatoria para crear usuarios.',
        'warning'
      );
      return;
    }

    try {
      if (this.editingUserId) {
        await firstValueFrom(
          this.rbacService.updateUser(this.editingUserId, {
            firstName: value.firstName,
            lastName: value.lastName,
            phone: value.phone,
            email: value.email,
            chapterId: value.chapterId,
            roles: value.roles,
            isActive: value.isActive,
            password: value.password || undefined,
          })
        );
        await this.notify('Usuario actualizado.');
      } else {
        await firstValueFrom(
          this.rbacService.createUser({
            dni: value.dni,
            password: value.password,
            firstName: value.firstName,
            lastName: value.lastName,
            phone: value.phone,
            email: value.email,
            chapterId: value.chapterId,
            roles: value.roles,
          })
        );
        await this.notify('Usuario creado.');
      }
    } catch (error) {
      const message = this.getErrorMessage(error);
      if (
        message.includes('User already exists') ||
        message.includes('already exists')
      ) {
        await this.notify(
          `Usuario con DNI ${value.dni} ya registrado.`,
          'warning'
        );
        return;
      }
      await this.notify(message || 'No se pudo guardar el usuario.', 'danger');
      return;
    }
    this.resetUserForm();
    await this.loadUsers();
  }

  getUserRolesLabel(user: AdminUserDto): string {
    return user.roles.map((r) => r.role.name).join(', ');
  }

  editUser(user: AdminUserDto) {
    this.editingUserId = user.id;
    this.userForm.reset({
      dni: user.dni,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      chapterId: user.chapter?.id ?? '',
      associationId: user.chapter?.branch?.association?.id ?? '',
      branchId: user.chapter?.branch?.id ?? '',
      roles: user.roles.map(
        (role: { role: { name: string } }) => role.role.name
      ),
      isActive: user.isActive,
    });
    this.userForm.controls.dni.disable({ emitEvent: false });
    this.syncUserFormDependencies();
  }

  resetUserForm() {
    this.editingUserId = null;
    this.userForm.reset({
      dni: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      associationId: '',
      branchId: '',
      chapterId: '',
      roles: [],
      isActive: true,
    });
    this.userForm.controls.dni.enable({ emitEvent: false });
    this.syncUserFormDependencies();
  }

  onUserAssociationChange(value: string) {
    this.userForm.patchValue({
      associationId: value,
      branchId: '',
      chapterId: '',
    });
    this.syncUserFormDependencies();
  }

  onUserBranchChange(value: string) {
    this.userForm.patchValue({ branchId: value, chapterId: '' });
    this.syncUserFormDependencies();
  }

  branchesForUserAssociation(): BranchDto[] {
    const associationId = this.userForm.controls.associationId.value;
    if (!associationId) {
      return [];
    }
    return this.branches().filter(
      (branch) => branch.associationId === associationId
    );
  }

  chaptersForUserBranch(): ChapterDto[] {
    const branchId = this.userForm.controls.branchId.value;
    if (!branchId) {
      return [];
    }
    return this.chapters().filter((chapter) => chapter.branchId === branchId);
  }

  async deleteUser(user: AdminUserDto) {
    if (!window.confirm(`Eliminar el usuario ${user.firstName}?`)) {
      return;
    }
    await firstValueFrom(this.rbacService.deleteUser(user.id));
    await this.notify('Usuario eliminado.');
    await this.loadUsers();
  }

  onDniInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '').slice(0, 8);
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
    this.userForm.patchValue({ dni: sanitized }, { emitEvent: false });
  }

  private syncUserFormDependencies() {
    const associationId = this.userForm.controls.associationId.value;
    const branchId = this.userForm.controls.branchId.value;

    if (associationId) {
      this.userForm.controls.branchId.enable({ emitEvent: false });
    } else {
      this.userForm.controls.branchId.disable({ emitEvent: false });
      this.userForm.controls.branchId.setValue('', { emitEvent: false });
    }

    if (branchId) {
      this.userForm.controls.chapterId.enable({ emitEvent: false });
    } else {
      this.userForm.controls.chapterId.disable({ emitEvent: false });
      this.userForm.controls.chapterId.setValue('', { emitEvent: false });
    }
  }

  private getErrorMessage(error: unknown): string {
    const message =
      (error as { error?: { message?: string | string[] } })?.error?.message ??
      (error as { message?: string | string[] })?.message ??
      '';
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return String(message ?? '');
  }
}
