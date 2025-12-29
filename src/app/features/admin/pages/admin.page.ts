import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { AuditLogDto } from '../../../core/models/audit.models';
import { PartyDto } from '../../../core/models/parties.models';
import {
  AdminUserDto,
  PermissionDto,
  RoleDto,
} from '../../../core/models/rbac.models';
import {
  AssociationDto,
  BranchDto,
  ChapterDto,
  SpecialtyDto,
} from '../../../core/models/structure.models';
import { AuditService } from '../../../core/services/audit.service';
import { AssociationsService } from '../../../core/services/associations.service';
import { AuthService } from '../../../core/services/auth.service';
import { BranchesService } from '../../../core/services/branches.service';
import { ChaptersService } from '../../../core/services/chapters.service';
import { PadronService } from '../../../core/services/padron.service';
import { PartiesService } from '../../../core/services/parties.service';
import { RbacService } from '../../../core/services/rbac.service';
import { SpecialtiesService } from '../../../core/services/specialties.service';

type AdminSection =
  | 'home'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'associations'
  | 'branches'
  | 'specialties'
  | 'chapters'
  | 'parties'
  | 'padron'
  | 'audit';

type PadronPreviewRow = {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchName: string;
  chapterName: string;
  isPaidUp: string;
};

const MAX_PADRON_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  styleUrls: ['admin.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonContent],
})
export class AdminPage implements OnInit {
  activeSection: AdminSection = 'home';
  isBusy = signal(false);

  users = signal<AdminUserDto[]>([]);
  roles = signal<RoleDto[]>([]);
  permissions = signal<PermissionDto[]>([]);
  associations = signal<AssociationDto[]>([]);
  branches = signal<BranchDto[]>([]);
  specialties = signal<SpecialtyDto[]>([]);
  chapters = signal<ChapterDto[]>([]);
  parties = signal<PartyDto[]>([]);
  auditLogs = signal<AuditLogDto[]>([]);

  userFilter = signal('');
  userStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  userChapterFilter = signal('');
  roleFilter = signal('');
  permissionFilter = signal('');
  associationFilter = signal('');
  branchFilter = signal('');
  branchAssociationFilter = signal('');
  specialtyFilter = signal('');
  specialtyAssociationFilter = signal('');
  chapterFilter = signal('');
  chapterBranchFilter = signal('');
  chapterSpecialtyFilter = signal('');
  chapterAssociationFilter = signal('');
  chapterFormBranchId = signal('');
  chapterFormSpecialtyIds = signal<string[]>([]);
  partyFilter = signal('');
  partyStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  auditFilter = signal('');
  partyAssociationFilter = signal('');
  partyBranchFilter = signal('');

  editingUserId: string | null = null;
  editingRoleId: string | null = null;
  editingPermissionId: string | null = null;
  editingAssociationId: string | null = null;
  editingBranchId: string | null = null;
  editingSpecialtyId: string | null = null;
  editingChapterId: string | null = null;
  editingPartyId: string | null = null;

  readonly sectionMeta: Record<AdminSection, { title: string; description: string }> = {
    home: {
      title: 'Inicio',
      description: 'Resumen rápido y accesos frecuentes del panel.',
    },
    users: {
      title: 'Usuarios',
      description: 'Administra usuarios, capítulos y roles asignados.',
    },
    roles: {
      title: 'Roles',
      description: 'Define roles y su descripción de acceso.',
    },
    permissions: {
      title: 'Permisos',
      description: 'Gestiona permisos para cada rol del sistema.',
    },
    associations: {
      title: 'Asociaciones',
      description: 'Registra colegios profesionales y asociaciones madre.',
    },
    branches: {
      title: 'Sedes',
      description: 'Gestiona las sedes físicas por asociación.',
    },
    specialties: {
      title: 'Especialidades',
      description: 'Mantén el catálogo de especialidades disponibles.',
    },
    chapters: {
      title: 'Capítulos',
      description: 'Asigna capítulos por sede y especialidad.',
    },
    parties: {
      title: 'Organizaciones políticas',
      description: 'Crea y administra partidos o movimientos.',
    },
    padron: {
      title: 'Padrón',
      description: 'Importa usuarios desde Excel y sincroniza habilitaciones.',
    },
    audit: {
      title: 'Auditoría',
      description: 'Historial de acciones críticas en el sistema.',
    },
  };

  readonly userForm = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    password: ['', [Validators.minLength(8)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.required, Validators.email]],
    chapterId: ['', [Validators.required]],
    roles: [[] as string[]],
    isActive: [true],
  });

  readonly roleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  readonly permissionForm = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  readonly assignPermissionsForm = this.fb.nonNullable.group({
    roleId: ['', [Validators.required]],
    permissions: [[] as string[]],
  });

  readonly assignRolesForm = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    roles: [[] as string[]],
  });

  readonly associationForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly branchForm = this.fb.nonNullable.group({
    associationId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly specialtyForm = this.fb.nonNullable.group({
    associationId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly chapterForm = this.fb.nonNullable.group({
    branchId: ['', [Validators.required]],
    specialtyIds: [[] as string[]],
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly partyForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    acronym: [''],
    scope: ['NATIONAL' as PartyDto['scope']],
    associationId: [''],
    branchId: [''],
    chapterId: [''],
    isActive: [true],
  });

  readonly partyScopes: PartyDto['scope'][] = ['NATIONAL', 'ASSOCIATION', 'BRANCH', 'CHAPTER'];

  getPartyScopeLabel(scope: PartyDto['scope'] | null | undefined): string {
    switch (scope) {
      case 'ASSOCIATION':
        return 'Asociación';
      case 'BRANCH':
        return 'Sede';
      case 'CHAPTER':
        return 'Capítulo';
      default:
        return 'Nacional';
    }
  }

  padronImportResult = signal<string | null>(null);
  padronImportDetails = signal<string[]>([]);
  padronDisableResult = signal<string | null>(null);
  padronDisableDetails = signal<string[]>([]);
  showPadronResultModal = signal(false);
  padronModalTitle = signal('');
  padronModalSummary = signal('');
  padronModalOmitted = signal<string[]>([]);
  padronModalRejected = signal<string | null>(null);
  padronModalStats = signal({ created: 0, updated: 0, disabled: 0, skipped: 0 });
  chapterSpecialtiesOpen = signal(false);
  @ViewChild('chapterSpecialtiesSelect') chapterSpecialtiesSelect?: ElementRef<HTMLElement>;
  padronImportFile: File | null = null;
  padronDisableFile: File | null = null;
  padronImportPreview = signal<PadronPreviewRow[]>([]);
  padronDisablePreview = signal<PadronPreviewRow[]>([]);
  padronImportPreviewNote = signal<string | null>(null);
  padronDisablePreviewNote = signal<string | null>(null);
  partyScopeNotice = signal<string | null>(null);

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
          `${user.dni} ${user.firstName} ${user.lastName} ${user.email} ${user.phone}`,
        ),
      ),
  );
  readonly filteredRoles = computed(() =>
    this.filterBy(this.roles(), this.roleFilter(), (role) => `${role.name} ${role.description ?? ''}`),
  );
  readonly filteredPermissions = computed(() =>
    this.filterBy(
      this.permissions(),
      this.permissionFilter(),
      (permission) => `${permission.key} ${permission.description ?? ''}`,
    ),
  );
  readonly filteredAssociations = computed(() =>
    this.filterBy(this.associations(), this.associationFilter(), (association) => association.name),
  );
  readonly filteredBranches = computed(() =>
    this.branches()
      .filter((branch) => {
        const associationId = this.branchAssociationFilter();
        if (associationId && branch.associationId !== associationId) {
          return false;
        }
        return true;
      })
      .filter((branch) =>
        this.matchesTerm(
          this.branchFilter(),
          `${branch.name} ${branch.association?.name ?? ''}`,
        ),
      ),
  );
  readonly filteredSpecialties = computed(() =>
    this.specialties()
      .filter((specialty) => {
        const associationId = this.specialtyAssociationFilter();
        if (!associationId) {
          return true;
        }
        return specialty.associationId === associationId;
      })
      .filter((specialty) =>
        this.matchesTerm(
          this.specialtyFilter(),
          `${specialty.name} ${specialty.association?.name ?? ''}`,
        ),
      ),
  );
  readonly filteredChapters = computed(() =>
    this.chapters()
      .filter((chapter) => {
        const associationId = this.chapterAssociationFilter();
        const branchId = this.chapterBranchFilter();
        const specialtyId = this.chapterSpecialtyFilter();
        if (associationId) {
          if (chapter.branch?.association?.id !== associationId) {
            return false;
          }
        }
        if (branchId && chapter.branchId !== branchId) {
          return false;
        }
        if (
          specialtyId &&
          !chapter.specialties?.some((entry) => entry.specialtyId === specialtyId)
        ) {
          return false;
        }
        return true;
      })
      .filter((chapter) =>
        this.matchesTerm(
          this.chapterFilter(),
          `${chapter.name} ${chapter.branch?.name ?? ''} ${
            chapter.specialties?.map((entry) => entry.specialty?.name ?? '').join(' ') ?? ''
          }`,
        ),
      ),
  );
  readonly filteredParties = computed(() =>
    this.parties()
      .filter((party) => {
        const status = this.partyStatusFilter();
        if (status === 'ACTIVE' && !party.isActive) {
          return false;
        }
        if (status === 'INACTIVE' && party.isActive) {
          return false;
        }
        return true;
      })
      .filter((party) =>
        this.matchesTerm(this.partyFilter(), `${party.name} ${party.acronym ?? ''}`),
      ),
  );
  readonly filteredAudit = computed(() =>
    this.filterBy(this.auditLogs(), this.auditFilter(), (log) => `${log.action} ${log.entity}`),
  );

  readonly pageSize = 10;
  userPage = signal(0);
  rolePage = signal(0);
  permissionPage = signal(0);
  associationPage = signal(0);
  branchPage = signal(0);
  specialtyPage = signal(0);
  chapterPage = signal(0);
  partyPage = signal(0);
  auditPage = signal(0);

  readonly pagedUsers = computed(() => this.paginate(this.filteredUsers(), this.userPage()));
  readonly pagedRoles = computed(() => this.paginate(this.filteredRoles(), this.rolePage()));
  readonly pagedPermissions = computed(() => this.paginate(this.filteredPermissions(), this.permissionPage()));
  readonly pagedAssociations = computed(() => this.paginate(this.filteredAssociations(), this.associationPage()));
  readonly pagedBranches = computed(() => this.paginate(this.filteredBranches(), this.branchPage()));
  readonly pagedSpecialties = computed(() => this.paginate(this.filteredSpecialties(), this.specialtyPage()));
  readonly pagedChapters = computed(() => this.paginate(this.filteredChapters(), this.chapterPage()));
  readonly pagedParties = computed(() => this.paginate(this.filteredParties(), this.partyPage()));
  readonly pagedAudit = computed(() => this.paginate(this.filteredAudit(), this.auditPage()));

  readonly userPages = computed(() => this.pageCount(this.filteredUsers()));
  readonly rolePages = computed(() => this.pageCount(this.filteredRoles()));
  readonly permissionPages = computed(() => this.pageCount(this.filteredPermissions()));
  readonly associationPages = computed(() => this.pageCount(this.filteredAssociations()));
  readonly branchPages = computed(() => this.pageCount(this.filteredBranches()));
  readonly specialtyPages = computed(() => this.pageCount(this.filteredSpecialties()));
  readonly chapterPages = computed(() => this.pageCount(this.filteredChapters()));
  readonly partyPages = computed(() => this.pageCount(this.filteredParties()));
  readonly auditPages = computed(() => this.pageCount(this.filteredAudit()));

  readonly partyBranchesForAssociation = computed(() => {
    const associationId = this.partyAssociationFilter();
    if (!associationId) {
      return this.branches();
    }
    return this.branches().filter((branch) => branch.associationId === associationId);
  });

  readonly partyChaptersForBranch = computed(() => {
    const branchId = this.partyBranchFilter();
    if (!branchId) {
      return [];
    }
    return this.chapters().filter((chapter) => chapter.branchId === branchId);
  });

  readonly partyBranchesAvailable = computed(() => this.partyBranchesForAssociation().length > 0);
  readonly partyChaptersAvailable = computed(() => this.partyChaptersForBranch().length > 0);

  readonly branchesForChapterAssociation = computed(() => {
    const associationId = this.chapterAssociationFilter();
    if (!associationId) {
      return [];
    }
    return this.branches().filter((branch) => branch.associationId === associationId);
  });

  readonly specialtiesForChapter = computed(() => {
    const associationId = this.chapterAssociationFilter();
    if (!associationId) {
      return [];
    }
    const branchId = this.chapterFormBranchId();
    if (!branchId) {
      return [];
    }
    const assignedInBranch = new Set(
      this.chapters()
        .filter((chapter) => chapter.branchId === branchId)
        .reduce<string[]>((acc, chapter) => {
          const ids = chapter.specialties?.map((entry) => entry.specialtyId) ?? [];
          return acc.concat(ids);
        }, []),
    );
    const currentChapterSpecialties = new Set(
      this.chapters()
        .find((chapter) => chapter.id === this.editingChapterId)
        ?.specialties?.map((entry) => entry.specialtyId) ?? [],
    );
    return this.specialties().filter((specialty) => {
      if (specialty.associationId !== associationId) {
        return false;
      }
      if (!assignedInBranch.has(specialty.id)) {
        return true;
      }
      return currentChapterSpecialties.has(specialty.id);
    });
  });

  readonly specialtiesForChapterFilter = computed(() => {
    const associationId = this.chapterAssociationFilter();
    if (!associationId) {
      return this.specialties();
    }
    return this.specialties().filter((specialty) => specialty.associationId === associationId);
  });

  readonly selectedChapterSpecialties = computed(() => {
    const specialtyIds = this.chapterFormSpecialtyIds();
    if (!specialtyIds.length) {
      return [];
    }
    return this.specialties().filter((specialty) => specialtyIds.includes(specialty.id));
  });

  readonly chaptersForSpecialtyAssociation = computed(() => {
    const associationId = this.specialtyAssociationFilter();
    if (!associationId) {
      return this.chapters();
    }
    return this.chapters().filter((chapter) => chapter.branch?.association?.id === associationId);
  });

  private toastController = inject(ToastController);
  private auditService = inject(AuditService);
  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private rbacService: RbacService,
    private associationsService: AssociationsService,
    private branchesService: BranchesService,
    private specialtiesService: SpecialtiesService,
    private chaptersService: ChaptersService,
    private partiesService: PartiesService,
    private padronService: PadronService,
  ) {}

  get currentUserName(): string {
    const user = this.authService.getUser();
    if (!user) {
      return 'Administrador';
    }
    return `${user.firstName} ${user.lastName}`.trim();
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.userFilter();
        this.userStatusFilter();
        this.userChapterFilter();
        this.userPage.set(0);
      });
      effect(() => {
        this.roleFilter();
        this.rolePage.set(0);
      });
      effect(() => {
        this.permissionFilter();
        this.permissionPage.set(0);
      });
      effect(() => {
        this.associationFilter();
        this.associationPage.set(0);
      });
      effect(() => {
        this.branchFilter();
        this.branchAssociationFilter();
        this.branchPage.set(0);
      });
      effect(() => {
        this.specialtyFilter();
        this.specialtyAssociationFilter();
        this.specialtyPage.set(0);
      });
      effect(() => {
        this.chapterFilter();
        this.chapterBranchFilter();
        this.chapterSpecialtyFilter();
        this.chapterAssociationFilter();
        this.chapterPage.set(0);
      });
      effect(() => {
        this.partyFilter();
        this.partyStatusFilter();
        this.partyPage.set(0);
      });
      effect(() => {
        this.auditFilter();
        this.auditPage.set(0);
      });
    });
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    this.setInitialSection();
    await this.loadSectionData(this.activeSection);
  }

  get sectionTitle(): string {
    return this.sectionMeta[this.activeSection].title;
  }

  get sectionDescription(): string {
    return this.sectionMeta[this.activeSection].description;
  }

  async setSection(section: AdminSection) {
    if (!this.canAccessSection(section)) {
      return;
    }
    this.activeSection = section;
    await this.loadSectionData(section);
  }

  canAccessSection(section: AdminSection): boolean {
    if (section === 'home') {
      return true;
    }
    if (this.authService.hasRole('SystemAdmin')) {
      return true;
    }
    const permissionMap: Record<AdminSection, string | null> = {
      home: null,
      users: 'users.manage',
      roles: 'rbac.manage',
      permissions: 'rbac.manage',
      associations: 'associations.manage',
      branches: 'branches.manage',
      specialties: 'specialties.manage',
      chapters: 'chapters.manage',
      parties: 'parties.manage',
      padron: 'padron.manage',
      audit: 'rbac.manage',
    };
    const permission = permissionMap[section];
    if (!permission) {
      return false;
    }
    const user = this.authService.getUser();
    return Boolean(user && user.permissions.includes(permission));
  }

  async logout() {
    await firstValueFrom(this.authService.logout());
    await this.router.navigateByUrl('/login');
  }

  async loadUsers() {
    this.users.set(await firstValueFrom(this.rbacService.listUsers()));
  }

  async loadRoles() {
    this.roles.set(await firstValueFrom(this.rbacService.listRoles()));
  }

  async loadPermissions() {
    this.permissions.set(await firstValueFrom(this.rbacService.listPermissions()));
  }

  async loadAssociations() {
    this.associations.set(await firstValueFrom(this.associationsService.list()));
  }

  async loadBranches() {
    this.branches.set(await firstValueFrom(this.branchesService.list()));
  }

  async loadSpecialties() {
    this.specialties.set(await firstValueFrom(this.specialtiesService.list()));
  }

  async loadChapters() {
    this.chapters.set(await firstValueFrom(this.chaptersService.list()));
  }

  async loadParties() {
    this.parties.set(await firstValueFrom(this.partiesService.list()));
  }

  async loadAuditLogs() {
    this.auditLogs.set(await firstValueFrom(this.auditService.listLogs({ limit: 60 })));
  }

  async saveUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.getRawValue();
    if (!this.editingUserId && !value.password) {
      await this.notify('La contraseña es obligatoria para crear usuarios.', 'warning');
      return;
    }

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
        }),
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
        }),
      );
      await this.notify('Usuario creado.');
    }

    this.resetUserForm();
    await this.loadUsers();
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
      roles: user.roles.map((role) => role.role.name),
      isActive: user.isActive,
    });
    this.userForm.controls.dni.disable();
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
      chapterId: '',
      roles: [],
      isActive: true,
    });
    this.userForm.controls.dni.enable();
  }

  async deleteUser(user: AdminUserDto) {
    if (!window.confirm(`Eliminar al usuario ${user.dni}?`)) {
      return;
    }
    await firstValueFrom(this.rbacService.deleteUser(user.id));
    await this.notify('Usuario eliminado.');
    await this.loadUsers();
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

  async replaceRolesByDni() {
    if (this.assignRolesForm.invalid) {
      this.assignRolesForm.markAllAsTouched();
      return;
    }
    const value = this.assignRolesForm.getRawValue();
    await firstValueFrom(this.rbacService.replaceRolesForUserByDni(value.dni, value.roles));
    await this.notify('Roles asignados al usuario.');
    this.assignRolesForm.reset({ dni: '', roles: [] });
    await this.loadUsers();
  }

  async saveAssociation() {
    if (this.associationForm.invalid) {
      this.associationForm.markAllAsTouched();
      return;
    }
    const value = this.associationForm.getRawValue();
    if (this.editingAssociationId) {
      await firstValueFrom(this.associationsService.update(this.editingAssociationId, value));
      await this.notify('Asociación actualizada.');
    } else {
      await firstValueFrom(this.associationsService.create(value));
      await this.notify('Asociación creada.');
    }
    this.resetAssociationForm();
    await this.loadAssociations();
  }

  editAssociation(association: AssociationDto) {
    this.editingAssociationId = association.id;
    this.associationForm.reset({ name: association.name });
  }

  resetAssociationForm() {
    this.editingAssociationId = null;
    this.associationForm.reset({ name: '' });
  }

  async deleteAssociation(association: AssociationDto) {
    if (!window.confirm(`Eliminar la asociación ${association.name}?`)) {
      return;
    }
    await firstValueFrom(this.associationsService.delete(association.id));
    await this.notify('Asociación eliminada.');
    await this.loadAssociations();
  }

  async saveBranch() {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }
    const value = this.branchForm.getRawValue();
    if (this.editingBranchId) {
      await firstValueFrom(this.branchesService.update(this.editingBranchId, value));
      await this.notify('Sede actualizada.');
    } else {
      await firstValueFrom(this.branchesService.create(value));
      await this.notify('Sede creada.');
    }
    this.resetBranchForm();
    await this.loadBranches();
  }

  editBranch(branch: BranchDto) {
    this.editingBranchId = branch.id;
    this.branchForm.reset({
      associationId: branch.associationId,
      name: branch.name,
    });
  }

  resetBranchForm() {
    this.editingBranchId = null;
    this.branchForm.reset({ associationId: '', name: '' });
  }

  async deleteBranch(branch: BranchDto) {
    if (!window.confirm(`Eliminar la sede ${branch.name}?`)) {
      return;
    }
    await firstValueFrom(this.branchesService.delete(branch.id));
    await this.notify('Sede eliminada.');
    await this.loadBranches();
  }

  async saveSpecialty() {
    if (this.specialtyForm.invalid) {
      this.specialtyForm.markAllAsTouched();
      return;
    }
    const value = this.specialtyForm.getRawValue();
    if (this.editingSpecialtyId) {
      await firstValueFrom(this.specialtiesService.update(this.editingSpecialtyId, value));
      await this.notify('Especialidad actualizada.');
    } else {
      await firstValueFrom(this.specialtiesService.create(value));
      await this.notify('Especialidad creada.');
    }
    this.resetSpecialtyForm();
    await this.loadSpecialties();
  }

  editSpecialty(specialty: SpecialtyDto) {
    this.editingSpecialtyId = specialty.id;
    this.specialtyForm.reset({ name: specialty.name, associationId: specialty.associationId });
  }

  resetSpecialtyForm() {
    this.editingSpecialtyId = null;
    this.specialtyForm.reset({ name: '', associationId: '' });
  }

  async deleteSpecialty(specialty: SpecialtyDto) {
    if (!window.confirm(`Eliminar la especialidad ${specialty.name}?`)) {
      return;
    }
    await firstValueFrom(this.specialtiesService.delete(specialty.id));
    await this.notify('Especialidad eliminada.');
    await this.loadSpecialties();
  }

  async saveChapter() {
    if (this.chapterForm.invalid) {
      this.chapterForm.markAllAsTouched();
      return;
    }
    if (!this.chapterAssociationFilter()) {
      await this.notify('Selecciona una asociación primero.', 'warning');
      return;
    }
    const value = this.chapterForm.getRawValue();
    if (!value.specialtyIds.length) {
      delete (value as { specialtyIds?: string[] }).specialtyIds;
    }
    if (this.editingChapterId) {
      await firstValueFrom(this.chaptersService.update(this.editingChapterId, value));
      await this.notify('Capítulo actualizado.');
    } else {
      await firstValueFrom(this.chaptersService.create(value));
      await this.notify('Capítulo creado.');
    }
    this.resetChapterForm(!this.editingChapterId);
    await this.loadChapters();
  }

  editChapter(chapter: ChapterDto) {
    this.editingChapterId = chapter.id;
    this.chapterAssociationFilter.set(chapter.branch?.association?.id ?? '');
    this.chapterForm.reset({
      branchId: chapter.branchId,
      specialtyIds: chapter.specialties?.map((entry) => entry.specialtyId) ?? [],
      name: chapter.name,
    });
    this.chapterFormBranchId.set(chapter.branchId);
    this.chapterFormSpecialtyIds.set(
      chapter.specialties?.map((entry) => entry.specialtyId) ?? [],
    );
  }

  resetChapterForm(keepSelection = false) {
    this.editingChapterId = null;
    if (keepSelection) {
      this.chapterForm.reset({
        branchId: this.chapterForm.controls.branchId.value,
        specialtyIds: [],
        name: '',
      });
      this.chapterFormBranchId.set(this.chapterForm.controls.branchId.value);
      this.chapterFormSpecialtyIds.set([]);
      return;
    }
    this.chapterAssociationFilter.set('');
    this.chapterForm.reset({ branchId: '', specialtyIds: [], name: '' });
    this.chapterFormBranchId.set('');
    this.chapterFormSpecialtyIds.set([]);
  }

  async deleteChapter(chapter: ChapterDto) {
    if (!window.confirm(`Eliminar el capítulo ${chapter.name}?`)) {
      return;
    }
    await firstValueFrom(this.chaptersService.delete(chapter.id));
    await this.notify('Capítulo eliminado.');
    await this.loadChapters();
  }

  async saveParty() {
    if (this.partyForm.invalid) {
      this.partyForm.markAllAsTouched();
      return;
    }
    const value = this.partyForm.getRawValue();
    const payload = {
      name: value.name,
      acronym: value.acronym || undefined,
      scope: value.scope,
      associationId: value.associationId || undefined,
      branchId: value.branchId || undefined,
      chapterId: value.chapterId || undefined,
      isActive: value.isActive,
    };
    if (this.editingPartyId) {
      await firstValueFrom(this.partiesService.update(this.editingPartyId, payload));
      await this.notify('Partido actualizado.');
    } else {
      await firstValueFrom(this.partiesService.create(payload));
      await this.notify('Partido creado.');
    }
    this.resetPartyForm();
    await this.loadParties();
  }

  editParty(party: PartyDto) {
    this.editingPartyId = party.id;
    this.partyAssociationFilter.set(
      party.associationId ?? party.branch?.association?.id ?? party.chapter?.branch?.association?.id ?? '',
    );
    this.partyBranchFilter.set(party.branchId ?? party.chapter?.branch?.id ?? '');
    this.partyForm.reset({
      name: party.name,
      acronym: party.acronym ?? '',
      scope: party.scope,
      associationId: party.associationId ?? '',
      branchId: party.branchId ?? '',
      chapterId: party.chapterId ?? '',
      isActive: party.isActive,
    });
  }

  resetPartyForm() {
    this.editingPartyId = null;
    this.partyAssociationFilter.set('');
    this.partyBranchFilter.set('');
    this.partyForm.reset({
      name: '',
      acronym: '',
      scope: 'NATIONAL',
      associationId: '',
      branchId: '',
      chapterId: '',
      isActive: true,
    });
  }

  async deleteParty(party: PartyDto) {
    if (!window.confirm(`Eliminar el partido ${party.name}?`)) {
      return;
    }
    await firstValueFrom(this.partiesService.delete(party.id));
    await this.notify('Partido eliminado.');
    await this.loadParties();
  }

  onPartyScopeChange() {
    const scope = this.partyForm.controls.scope.value;
    this.partyScopeNotice.set(null);
    if (scope === 'NATIONAL') {
      this.partyForm.patchValue({ associationId: '', branchId: '', chapterId: '' });
      this.partyAssociationFilter.set('');
      this.partyBranchFilter.set('');
    }
    if (scope === 'ASSOCIATION') {
      this.partyForm.patchValue({ branchId: '', chapterId: '' });
      this.partyBranchFilter.set('');
    }
    if (scope === 'BRANCH') {
      this.partyForm.patchValue({ chapterId: '' });
      this.partyBranchFilter.set('');
    }
    if (scope === 'CHAPTER') {
      this.partyForm.patchValue({ chapterId: '' });
    }

    this.ensureValidPartyScope();
  }

  onPartyAssociationChange(value: string) {
    this.partyScopeNotice.set(null);
    this.partyAssociationFilter.set(value);
    this.partyForm.patchValue({ branchId: '', chapterId: '' });
    this.partyBranchFilter.set('');
    this.ensureValidPartyScope();
  }

  onPartyBranchChange(value: string) {
    this.partyScopeNotice.set(null);
    this.partyBranchFilter.set(value);
    this.partyForm.patchValue({ chapterId: '' });
    this.ensureValidPartyScope();
  }

  onChapterBranchChange(value: string) {
    this.chapterForm.patchValue({ branchId: value, specialtyIds: [] });
    this.chapterFormBranchId.set(value);
    this.chapterFormSpecialtyIds.set([]);
  }

  toggleChapterSpecialtySelection(specialtyId: string) {
    const current = this.chapterFormSpecialtyIds();
    const exists = current.includes(specialtyId);
    const next = exists ? current.filter((id) => id !== specialtyId) : [...current, specialtyId];
    this.chapterForm.patchValue({ specialtyIds: next });
    this.chapterFormSpecialtyIds.set(next);
  }

  toggleChapterSpecialtiesDropdown() {
    this.chapterSpecialtiesOpen.set(!this.chapterSpecialtiesOpen());
  }

  removeChapterSpecialty(specialtyId: string) {
    const current = this.chapterFormSpecialtyIds();
    const next = current.filter((id) => id !== specialtyId);
    this.chapterForm.patchValue({ specialtyIds: next });
    this.chapterFormSpecialtyIds.set(next);
  }

  onChapterAssociationChange(value: string) {
    this.chapterAssociationFilter.set(value);
    this.chapterForm.patchValue({ branchId: '', specialtyIds: [] });
    this.chapterFormBranchId.set('');
    this.chapterFormSpecialtyIds.set([]);
  }

  onChapterAssociationFilterChange(value: string) {
    this.chapterAssociationFilter.set(value);
    this.chapterBranchFilter.set('');
    this.chapterSpecialtyFilter.set('');
  }

  private ensureValidPartyScope() {
    const scope = this.partyForm.controls.scope.value;
    if (scope === 'BRANCH' && !this.partyBranchesAvailable()) {
      this.partyForm.patchValue({ scope: 'ASSOCIATION', branchId: '', chapterId: '' });
      this.partyBranchFilter.set('');
      this.partyScopeNotice.set('No hay sedes disponibles. Se cambió el scope a ASSOCIATION.');
    }
    if (scope === 'CHAPTER' && !this.partyBranchesAvailable()) {
      this.partyForm.patchValue({ scope: 'ASSOCIATION', branchId: '', chapterId: '' });
      this.partyBranchFilter.set('');
      this.partyScopeNotice.set('No hay sedes disponibles. Se cambió el scope a ASSOCIATION.');
      return;
    }
    if (scope === 'CHAPTER' && this.partyBranchesAvailable() && !this.partyChaptersAvailable()) {
      this.partyForm.patchValue({ scope: 'BRANCH', chapterId: '' });
      this.partyScopeNotice.set('No hay capítulos disponibles. Se cambió el scope a BRANCH.');
    }
  }

  private setInitialSection() {
    const ordered: AdminSection[] = [
      'home',
      'users',
      'roles',
      'permissions',
      'associations',
      'branches',
      'specialties',
      'chapters',
      'parties',
      'padron',
      'audit',
    ];
    const firstAllowed = ordered.find((section) => this.canAccessSection(section));
    if (firstAllowed) {
      this.activeSection = firstAllowed;
    }
  }

  private async loadSectionData(section: AdminSection) {
    if (section === 'home') {
      return;
    }
    if (section === 'users') {
      await Promise.all([this.loadUsers(), this.loadChapters(), this.loadRoles()]);
      return;
    }
    if (section === 'roles') {
      await Promise.all([this.loadRoles(), this.loadPermissions()]);
      return;
    }
    if (section === 'permissions') {
      await this.loadPermissions();
      return;
    }
    if (section === 'associations') {
      await this.loadAssociations();
      return;
    }
    if (section === 'branches') {
      await Promise.all([this.loadBranches(), this.loadAssociations()]);
      return;
    }
    if (section === 'specialties') {
      await Promise.all([this.loadSpecialties(), this.loadChapters(), this.loadAssociations()]);
      return;
    }
    if (section === 'chapters') {
      await Promise.all([this.loadChapters(), this.loadBranches(), this.loadSpecialties(), this.loadAssociations()]);
      return;
    }
    if (section === 'parties') {
      await Promise.all([this.loadParties(), this.loadAssociations(), this.loadBranches(), this.loadChapters()]);
      return;
    }
    if (section === 'padron') {
      return;
    }
    if (section === 'audit') {
      await this.loadAuditLogs();
    }
  }

  onPadronFileChange(event: Event, type: 'import' | 'disable') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > MAX_PADRON_FILE_SIZE) {
      void this.notify('El archivo supera los 5MB permitidos.', 'warning');
      input.value = '';
      if (type === 'import') {
        this.padronImportFile = null;
        this.padronImportPreview.set([]);
      } else {
        this.padronDisableFile = null;
        this.padronDisablePreview.set([]);
      }
      return;
    }
    if (type === 'import') {
      this.padronImportFile = file;
      this.padronImportResult.set(null);
      this.padronImportDetails.set([]);
      this.padronImportPreviewNote.set(null);
      this.padronImportPreview.set([]);
      if (file) {
        void this.loadPadronPreview(file, 'import');
      }
    } else {
      this.padronDisableFile = file;
      this.padronDisableResult.set(null);
      this.padronDisableDetails.set([]);
      this.padronDisablePreviewNote.set(null);
      this.padronDisablePreview.set([]);
      if (file) {
        void this.loadPadronPreview(file, 'disable');
      }
    }
  }

  async uploadPadron(type: 'import' | 'disable') {
    const file = type === 'import' ? this.padronImportFile : this.padronDisableFile;
    if (!file) {
      await this.notify('Selecciona un archivo XLSX.', 'warning');
      return;
    }
    const result = await firstValueFrom(
      type === 'import' ? this.padronService.import(file) : this.padronService.disable(file),
    );
    const summary = `Creado: ${result.created}, Actualizado: ${result.updated}, Deshabilitado: ${result.disabled}, Omitido: ${result.skipped}`;
    const omittedDetails: string[] = [];
    if (result.skippedDetails && result.skippedDetails.length > 0) {
      const maxDetails = 12;
      result.skippedDetails.slice(0, maxDetails).forEach((detail) => {
        omittedDetails.push(`${detail.dni ?? 'Sin DNI'} (${detail.reason})`);
      });
      if (result.skippedDetails.length > maxDetails) {
        omittedDetails.push('... más omitidos');
      }
    }
    const message = summary;
    if (type === 'import') {
      this.padronImportResult.set(message);
      this.padronImportDetails.set(omittedDetails);
    } else {
      this.padronDisableResult.set(message);
      this.padronDisableDetails.set(omittedDetails);
    }
    this.padronModalTitle.set(type === 'import' ? 'Resultado de importación' : 'Resultado de deshabilitación');
    this.padronModalSummary.set(summary);
    this.padronModalStats.set({
      created: result.created,
      updated: result.updated,
      disabled: result.disabled,
      skipped: result.skipped,
    });
    this.padronModalOmitted.set(omittedDetails);
    this.padronModalRejected.set(result.message ?? null);
    this.showPadronResultModal.set(true);
    await this.loadUsers();
  }

  closePadronModal() {
    this.showPadronResultModal.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (this.chapterSpecialtiesOpen()) {
      const container = this.chapterSpecialtiesSelect?.nativeElement;
      if (container && !container.contains(target)) {
        this.chapterSpecialtiesOpen.set(false);
      }
    }
  }

  private async loadPadronPreview(file: File, type: 'import' | 'disable') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return;
    }
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string | number | boolean>>(sheet, {
      defval: '',
    });
    const rows = json.map((row) => this.normalizePadronRow(row));
    const preview = rows.slice(0, 10);
    const note = rows.length > 10 ? `Mostrando 10 de ${rows.length} filas.` : null;
    if (type === 'import') {
      this.padronImportPreview.set(preview);
      this.padronImportPreviewNote.set(note);
    } else {
      this.padronDisablePreview.set(preview);
      this.padronDisablePreviewNote.set(note);
    }
  }

  private normalizePadronRow(raw: Record<string, string | number | boolean>): PadronPreviewRow {
    const normalized: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const normalizedKey = key.toString().trim().toLowerCase().replace(/\\s|_/g, '');
      normalized[normalizedKey] = String(value ?? '').trim();
    });

    const getValue = (aliases: string[]) => {
      for (const alias of aliases) {
        if (alias in normalized) {
          return normalized[alias];
        }
      }
      return '';
    };

    return {
      dni: getValue(['dni']),
      firstName: getValue(['firstname', 'nombres', 'name']),
      lastName: getValue(['lastname', 'apellidos', 'surname']),
      email: getValue(['email', 'correo']),
      phone: getValue(['phone', 'telefono', 'celular']),
      branchName: getValue(['branchname', 'sede', 'branch']),
      chapterName: getValue(['chaptername', 'capitulo', 'chapter']),
      isPaidUp: getValue(['ispaidup', 'pagosaldia', 'aldiam', 'aldia', 'activo', 'habilitado']),
    };
  }

  private filterBy<T>(list: T[], term: string, selector: (item: T) => string): T[] {
    const needle = term.trim().toLowerCase();
    if (!needle) {
      return list;
    }
    return list.filter((item) => selector(item).toLowerCase().includes(needle));
  }

  private matchesTerm(term: string, haystack: string): boolean {
    const needle = term.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return haystack.toLowerCase().includes(needle);
  }

  private paginate<T>(list: T[], page: number): T[] {
    const start = page * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  private pageCount(list: unknown[]): number {
    return Math.max(1, Math.ceil(list.length / this.pageSize));
  }

  changePage(pageSignal: { set: (value: number) => void; (): number }, totalPages: number, delta: number) {
    const next = Math.max(0, Math.min(totalPages - 1, pageSignal() + delta));
    pageSignal.set(next);
  }

  private async notify(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      color,
    });
    await toast.present();
  }
}
