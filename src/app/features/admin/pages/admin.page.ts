import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, signal, HostListener } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subject, filter, firstValueFrom, takeUntil } from 'rxjs';
import { AuthUser } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { ChaptersService } from '../../../core/services/chapters.service';
import { PartiesService } from '../../../core/services/parties.service';
import { RbacService } from '../../../core/services/rbac.service';

interface NavItem {
  label: string;
  link?: string;
  icon?: string;
  isSectionHeader?: boolean;
}

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  styleUrls: ['admin.page.scss'],
  imports: [CommonModule, IonContent, RouterOutlet, RouterLink, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
})
export class AdminPage implements OnInit, OnDestroy {
  sidebarCollapsed = signal(false);

  // Section header properties
  sectionTitle = '';
  sectionDescription = '';
  breadcrumbPrefix = '';

  // User properties
  currentUserName = 'Usuario';
  currentUserRole = 'Invitado';
  isMember = false;

  private readonly headerConfig = {
    SystemAdmin: {
      title: 'Panel',
      description: 'Administra las secciones del sistema.',
      breadcrumb: 'Admin',
    },
    Member: {
      title: 'Panel de Votante',
      description: 'Sección para miembros de votación.',
      breadcrumb: 'Votante',
    },
    default: {
      title: 'Panel',
      description: 'Bienvenido al sistema.',
      breadcrumb: 'Usuario',
    },
  };

  navItems: NavItem[] = [];

  usersCount = signal(0);
  chaptersCount = signal(0);
  partiesCount = signal(0);

  private adminNavItems: NavItem[] = [
    { label: 'Inicio', isSectionHeader: true },
    { label: 'Panel', link: '/admin/home', icon: 'IN' },
    { label: 'Gestión', isSectionHeader: true },
    { label: 'Usuarios', link: '/admin/users', icon: 'US' },
    { label: 'Roles', link: '/admin/roles', icon: 'RO' },
    { label: 'Permisos', link: '/admin/permissions', icon: 'PE' },
    { label: 'Estructura', isSectionHeader: true },
    { label: 'Asociaciones', link: '/admin/associations', icon: 'AS' },
    { label: 'Sedes', link: '/admin/branches', icon: 'SE' },
    { label: 'Especialidades', link: '/admin/specialties', icon: 'ES' },
    { label: 'Capítulos', link: '/admin/chapters', icon: 'CA' },
    { label: 'Política', isSectionHeader: true },
    { label: 'Elecciones', link: '/admin/elections', icon: 'EL' },
    { label: 'Partidos', link: '/admin/parties', icon: 'PO' },
    { label: 'Sistema', isSectionHeader: true },
    { label: 'Padrón', link: '/admin/padron', icon: 'PA' },
    { label: 'Auditoría', link: '/admin/audit', icon: 'AU' },
  ];

  private memberNavItems: NavItem[] = [
    { label: 'Menú', isSectionHeader: true },
    { label: 'Votación', link: '/admin/voting', icon: 'VT' },
    { label: 'Mi Perfil', link: '/admin/profile', icon: 'PE' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private rbacService: RbacService,
    private chaptersService: ChaptersService,
    private partiesService: PartiesService,
  ) {}

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.checkScreenSize();

    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.updateComponentStateForUser(user);
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.updateSectionMeta();
        if (this.isMobile()) {
          this.sidebarCollapsed.set(true);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateComponentStateForUser(user: AuthUser | null): void {
    if (user) {
      const isSystemAdmin = user.roles.includes('SystemAdmin');
      this.isMember = user.roles.includes('Member');

      // Update user display info
      this.currentUserName = `${user.firstName} ${user.lastName}`.trim();
      const roleMap: Record<string, string> = {
        SystemAdmin: 'Administrador',
        PadronManager: 'Gestor de Padrón',
        Member: 'Miembro',
      };
      this.currentUserRole = user.roles.map((r) => roleMap[r] || r).join(', ');

      // Update navigation
      this.navItems = this.isMember ? this.memberNavItems : this.adminNavItems;

      // Update header
      const config = isSystemAdmin ? this.headerConfig.SystemAdmin : this.isMember ? this.headerConfig.Member : this.headerConfig.default;
      this.sectionTitle = config.title;
      this.sectionDescription = config.description;
      this.breadcrumbPrefix = config.breadcrumb;
      
      // Load stats for admins
      if (isSystemAdmin) {
        void this.loadSidebarStats();
      } else {
        this.usersCount.set(0);
        this.chaptersCount.set(0);
        this.partiesCount.set(0);
      }
    } else {
      // Handle logged out state
      this.currentUserName = 'Usuario';
      this.currentUserRole = 'Invitado';
      this.isMember = false;
      this.navItems = [];
      this.sectionTitle = this.headerConfig.default.title;
      this.sectionDescription = this.headerConfig.default.description;
      this.breadcrumbPrefix = this.headerConfig.default.breadcrumb;
      this.usersCount.set(0);
      this.chaptersCount.set(0);
      this.partiesCount.set(0);
    }
    
    // This needs to be called after state is updated to reflect the correct title on load
    this.updateSectionMeta();
  }

  private checkScreenSize() {
    if (typeof window !== 'undefined') {
      this.sidebarCollapsed.set(window.innerWidth <= 1200);
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  closeSidebar() {
    this.sidebarCollapsed.set(true);
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 1200;
  }

  async logout() {
    await firstValueFrom(this.authService.logout());
    await this.router.navigateByUrl('/login');
  }

  private updateSectionMeta() {
    let route = this.route.firstChild;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    const data = route?.snapshot.data as { title?: string; description?: string } | undefined;

    // Fallback logic for title when route data is not available
    let currentConfigKey: keyof typeof this.headerConfig = 'default';
    if(this.authService.hasRole('SystemAdmin')) currentConfigKey = 'SystemAdmin';
    else if(this.authService.hasRole('Member')) currentConfigKey = 'Member';
    
    const currentConfig = this.headerConfig[currentConfigKey];
    this.sectionTitle = data?.title ?? currentConfig.title;
    this.sectionDescription = data?.description ?? currentConfig.description;
  }

  private async loadSidebarStats() {
    const [users, chapters, parties] = await Promise.all([
      firstValueFrom(this.rbacService.listUsers()).then((list) => list.length).catch(() => 0),
      firstValueFrom(this.chaptersService.list()).then((list) => list.length).catch(() => 0),
      firstValueFrom(this.partiesService.list()).then((list) => list.length).catch(() => 0),
    ]);
    this.usersCount.set(users);
    this.chaptersCount.set(chapters);
    this.partiesCount.set(parties);
  }
}
