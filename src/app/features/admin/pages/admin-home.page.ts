import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  templateUrl: 'admin-home.page.html',
  styleUrls: ['admin-home.page.scss'],
  imports: [CommonModule, RouterLink],
})
export class AdminHomePage {
  constructor(private authService: AuthService) {}

  get userName(): string {
    const user = this.authService.getUser();
    if (!user) {
      return 'Administrador';
    }
    return `${user.firstName} ${user.lastName}`.trim();
  }

  canAccessSection(section: string): boolean {
    if (section === 'home') {
      return true;
    }
    if (this.authService.hasRole('SystemAdmin')) {
      return true;
    }
    const permissionMap: Record<string, string> = {
      users: 'users.manage',
      padron: 'padron.manage',
      parties: 'parties.manage',
      elections: 'elections.manage',
    };
    const permission = permissionMap[section];
    if (!permission) {
      return false;
    }
    const user = this.authService.getUser();
    return Boolean(user && user.permissions.includes(permission));
  }
}
