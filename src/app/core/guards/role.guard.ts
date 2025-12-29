import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';

export const RoleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastController = inject(ToastController);
  const roles = (route.data?.['roles'] as string[] | undefined) ?? [];

  if (roles.length === 0) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  const user = authService.getUser();
  const allowed = Boolean(user && roles.some((role) => user.roles.includes(role)));

  if (!allowed) {
    void (async () => {
      const toast = await toastController.create({
        message: 'No tienes permisos para acceder a esta sección.',
        duration: 3000,
        color: 'medium',
      });
      await toast.present();
    })();
    return router.parseUrl('/login');
  }

  return true;
};
