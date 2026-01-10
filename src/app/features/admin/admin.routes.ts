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

export const routes: Routes = [
  {
    path: '',
    component: AdminPage,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        component: AdminHomePage,
        data: { title: 'Inicio', description: 'Resumen general del panel administrativo.' },
      },
      {
        path: 'elections',
        component: AdminElectionsSection,
        data: { title: 'Elecciones', description: 'Gestión de procesos electorales.' },
      },
      {
        path: 'elections/:id',
        component: AdminElectionDetailSection,
        data: { title: 'Detalle de Elección', description: 'Gestión de listas y candidatos.' },
      },
      {
        path: 'elections/:id/results',
        component: AdminElectionResultsSection,
        data: { title: 'Resultados de Elección', description: 'Visualización y gestión de resultados.' },
      },
      {
        path: 'users',
        component: AdminUsersSection,
        data: { title: 'Usuarios', description: 'Gestiona colegiados y sus accesos.' },
      },
      {
        path: 'roles',
        component: AdminRolesSection,
        data: { title: 'Roles', description: 'Define roles y sus permisos.' },
      },
      {
        path: 'permissions',
        component: AdminPermissionsSection,
        data: { title: 'Permisos', description: 'Catálogo y mantenimiento de permisos.' },
      },
      {
        path: 'associations',
        component: AdminAssociationsSection,
        data: { title: 'Asociaciones', description: 'Colegios profesionales y asociaciones madre.' },
      },
      {
        path: 'branches',
        component: AdminBranchesSection,
        data: { title: 'Sedes', description: 'Sedes activas por asociación.' },
      },
      {
        path: 'specialties',
        component: AdminSpecialtiesSection,
        data: { title: 'Especialidades', description: 'Catálogo de especialidades profesionales.' },
      },
      {
        path: 'chapters',
        component: AdminChaptersSection,
        data: { title: 'Capítulos', description: 'Capítulos por sede y especialidad.' },
      },
      {
        path: 'parties',
        component: AdminPartiesSection,
        data: { title: 'Partidos', description: 'Organizaciones políticas registradas.' },
      },
      {
        path: 'padron',
        component: AdminPadronSection,
        data: { title: 'Padrón', description: 'Importación y deshabilitación masiva.' },
      },
      {
        path: 'audit',
        component: AdminAuditSection,
        data: { title: 'Auditoría', description: 'Bitácora de eventos críticos.' },
      },
    ],
  },
];
