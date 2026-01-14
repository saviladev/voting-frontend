import { Routes } from '@angular/router';
import { AdminPage } from './pages/admin.page';
import { AdminHomePage } from './pages/admin-home.page';
import { AdminAssociationsSection } from './sections/admin-associations.section';
import { AdminAuditSection } from './sections/admin-audit.section';
import { AdminBranchesSection } from './sections/admin-branches.section';
import { AdminChaptersSection } from './sections/admin-chapters.section';
import { AdminPartiesSection } from './sections/admin-parties.section';
import { AdminPadronSection } from './sections/admin-padron.section';
import { AdminPermissionsSection } from './sections/admin-permissions.section';
import { AdminRolesSection } from './sections/admin-roles.section';
import { AdminSpecialtiesSection } from './sections/admin-specialties.section';
import { AdminUsersSection } from './sections/admin-users.section';
import { AdminElectionsSection } from './sections/admin-elections.section';
import { AdminElectionDetailSection } from './sections/admin-election-detail.section';
import { AdminElectionResultsSection } from './sections/admin-election-results.section';
import { RoleGuard } from '../../core/guards/role.guard';
import { ProfilePage } from './pages/profile.page';
import { VotingPage } from './pages/voting.page';
import { VotingDetailPage } from './pages/voting-detail.page';
import { RedirectPage } from './pages/redirect.page';

export const routes: Routes = [
  {
    path: '',
    component: AdminPage,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'redirect', // Redirect to the logic handler
      },
      {
        path: 'redirect',
        component: RedirectPage, // This component will redirect based on role
      },
      // =================================================================
      // == Member Routes
      // =================================================================
      {
        path: 'voting',
        component: VotingPage,
        canActivate: [RoleGuard],
        data: {
          roles: ['Member'],
          title: 'Votación',
          description: 'Emite tu voto en las elecciones abiertas.',
        },
      },
      {
        path: 'voting/:id',
        component: VotingDetailPage,
        canActivate: [RoleGuard],
        data: {
          roles: ['Member'],
          title: 'Emitir Voto',
          description: 'Selecciona tu candidato de preferencia.',
        },
      },
      {
        path: 'profile',
        component: ProfilePage,
        canActivate: [RoleGuard],
        data: {
          roles: ['Member'],
          title: 'Mi Perfil',
          description: 'Actualiza tu información personal.',
        },
      },
      // =================================================================
      // == Admin Routes
      // =================================================================
      {
        path: 'home',
        component: AdminHomePage,
        canActivate: [RoleGuard],
        data: {
          roles: ['SystemAdmin', 'PadronManager'],
          title: 'Inicio',
          description: 'Resumen general del panel administrativo.',
        },
      },
      {
        path: 'elections',
        component: AdminElectionsSection,
        canActivate: [RoleGuard],
        data: {
          roles: ['SystemAdmin', 'PadronManager'],
          title: 'Elecciones',
          description: 'Gestión de procesos electorales.',
        },
      },
      {
        path: 'elections/:id',
        component: AdminElectionDetailSection,
        canActivate: [RoleGuard],
        data: {
          roles: ['SystemAdmin', 'PadronManager'],
          title: 'Detalle de Elección',
          description: 'Gestión de listas y candidatos.',
        },
      },
      {
        path: 'elections/:id/results',
        component: AdminElectionResultsSection,
        canActivate: [RoleGuard],
        data: {
          roles: ['SystemAdmin', 'PadronManager'],
          title: 'Resultados de Elección',
          description: 'Visualización y gestión de resultados.',
        },
      },
      {
        path: 'users',
        component: AdminUsersSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Usuarios', description: 'Gestiona colegiados y sus accesos.' },
      },
      {
        path: 'roles',
        component: AdminRolesSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Roles', description: 'Define roles y sus permisos.' },
      },
      {
        path: 'permissions',
        component: AdminPermissionsSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Permisos', description: 'Catálogo y mantenimiento de permisos.' },
      },
      {
        path: 'associations',
        component: AdminAssociationsSection,
        canActivate: [RoleGuard],
        data: {
          roles: ['SystemAdmin'],
          title: 'Asociaciones',
          description: 'Colegios profesionales y asociaciones madre.',
        },
      },
      {
        path: 'branches',
        component: AdminBranchesSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Sedes', description: 'Sedes activas por asociación.' },
      },
      {
        path: 'specialties',
        component: AdminSpecialtiesSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Especialidades', description: 'Catálogo de especialidades profesionales.' },
      },
      {
        path: 'chapters',
        component: AdminChaptersSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Capítulos', description: 'Capítulos por sede y especialidad.' },
      },
      {
        path: 'parties',
        component: AdminPartiesSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Partidos', description: 'Organizaciones políticas registradas.' },
      },
      {
        path: 'padron',
        component: AdminPadronSection,
        canActivate: [RoleGuard],
        data: {
          roles: ['SystemAdmin', 'PadronManager'],
          title: 'Padrón',
          description: 'Importación y deshabilitación masiva.',
        },
      },
      {
        path: 'audit',
        component: AdminAuditSection,
        canActivate: [RoleGuard],
        data: { roles: ['SystemAdmin'], title: 'Auditoría', description: 'Bitácora de eventos críticos.' },
      },
    ],
  },
];
