import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { filter, firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ChaptersService } from '../../../core/services/chapters.service';
import { PartiesService } from '../../../core/services/parties.service';
import { RbacService } from '../../../core/services/rbac.service';

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
  | 'audit'
  | 'elections';

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  styleUrls: ['admin.page.scss'],
  imports: [CommonModule, IonContent, RouterOutlet, RouterLink, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
})
export class AdminPage implements OnInit {
  sidebarCollapsed = signal(false);
  sectionTitle = 'Panel';
  sectionDescription = 'Administra las secciones del sistema.';

  usersCount = signal(0);
  chaptersCount = signal(0);
  partiesCount = signal(0);

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private rbacService: RbacService,
    private chaptersService: ChaptersService,
    private partiesService: PartiesService,
  ) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.sidebarCollapsed.set(window.innerWidth <= 1200);
    }
    this.updateSectionMeta();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateSectionMeta();
      if (this.isMobile()) {
        this.sidebarCollapsed.set(true);
      }
    });
    void this.loadSidebarStats();
  }

  get currentUserName(): string {
    const user = this.authService.getUser();
    if (!user) {
      return 'Administrador';
    }
    return `${user.firstName} ${user.lastName}`.trim();
  }

  get currentUserRole(): string {
    const user = this.authService.getUser();
    if (!user || !user.roles?.length) {
      return 'Administrador';
    }
    return user.roles.join(', ');
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
      elections: 'elections.manage',
    };
    const permission = permissionMap[section];
    if (!permission) {
      return false;
    }
    const user = this.authService.getUser();
    return Boolean(user && user.permissions.includes(permission));
  }

  private updateSectionMeta() {
    let route = this.route.firstChild;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    const data = route?.snapshot.data as { title?: string; description?: string } | undefined;
    this.sectionTitle = data?.title ?? 'Panel';
    this.sectionDescription = data?.description ?? 'Administra las secciones del sistema.';
  }

  private async loadSidebarStats() {
    const [users, chapters, parties] = await Promise.all([
      this.canAccessSection('users')
        ? firstValueFrom(this.rbacService.listUsers()).then((list) => list.length).catch(() => 0)
        : Promise.resolve(0),
      this.canAccessSection('chapters')
        ? firstValueFrom(this.chaptersService.list()).then((list) => list.length).catch(() => 0)
        : Promise.resolve(0),
      this.canAccessSection('parties')
        ? firstValueFrom(this.partiesService.list()).then((list) => list.length).catch(() => 0)
        : Promise.resolve(0),
    ]);
    this.usersCount.set(users);
    this.chaptersCount.set(chapters);
    this.partiesCount.set(parties);
  }
}
