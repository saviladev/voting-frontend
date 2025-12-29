import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-home',
  templateUrl: 'admin-home.page.html',
  styleUrls: ['admin-home.page.scss'],
  imports: [CommonModule, IonContent, RouterLink],
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
}
