import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-redirect-page',
  template: '', // This component has no view
  standalone: true,
})
export class RedirectPage implements OnInit {
  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    if (this.authService.hasRole('Member')) {
      this.router.navigate(['/admin/voting'], { replaceUrl: true });
    } else {
      this.router.navigate(['/admin/home'], { replaceUrl: true });
    }
  }
}
