import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, signal, HostListener } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { filter, firstValueFrom } from 'rxjs';
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
export class AdminPage implements OnInit {
  sidebarCollapsed = signal(false);
  
  // Section header properties, now dynamic
  sectionTitle = '';
  sectionDescription = '';
  breadcrumbPrefix = '';

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
    }
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
    this.setupNavigation();
    this.setupHeaderContent();
    this.checkScreenSize();

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateSectionMeta();
      if (this.isMobile()) {
        this.sidebarCollapsed.set(true);
      }
    });

    if (!this.authService.hasRole('Member')) {
      void this.loadSidebarStats();
    }
  }

  private checkScreenSize() {
    if (typeof window !== 'undefined') {
      this.sidebarCollapsed.set(window.innerWidth <= 1200);
    }
  }

  private setupHeaderContent(): void {
    const user = this.authService.getUser();
    let config = this.headerConfig.default;

    if (user?.roles.includes('SystemAdmin')) {
      config = this.headerConfig.SystemAdmin;
    } else if (user?.roles.includes('Member')) {
      config = this.headerConfig.Member;
    }
    
    this.sectionTitle = config.title;
    this.sectionDescription = config.description;
    this.breadcrumbPrefix = config.breadcrumb;
  }

  private setupNavigation(): void {
    if (this.authService.hasRole('Member')) {
      this.navItems = this.memberNavItems;
    } else {
      this.navItems = this.adminNavItems;
    }
  }

  get currentUserName(): string {
    const user = this.authService.getUser();
    if (!user) return 'Usuario';
    return `${user.firstName} ${user.lastName}`.trim();
  }

  get currentUserRole(): string {
    const user = this.authService.getUser();
    if (!user || !user.roles?.length) return 'Invitado';
    
    const roleMap: Record<string, string> = {
      SystemAdmin: 'Administrador',
      PadronManager: 'Gestor de Padrón',
      Member: 'Miembro'
    };

    return user.roles.map(r => roleMap[r] || r).join(', ');
  }

  isMember(): boolean {
    return this.authService.hasRole('Member');
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
    
    // Use route data if available, otherwise fall back to the role-based defaults
    const currentConfig = this.headerConfig[this.authService.getUser()?.roles[0] as keyof typeof this.headerConfig] || this.headerConfig.default;
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
