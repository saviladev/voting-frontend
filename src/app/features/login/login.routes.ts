import { Routes } from '@angular/router';
import { ForgotPasswordPage } from './pages/forgot-password.page';
import { LoginPage } from './pages/login.page';
import { ResetPasswordPage } from './pages/reset-password.page';

export const routes: Routes = [
  {
    path: '',
    component: LoginPage,
  },
  {
    path: 'forgot',
    component: ForgotPasswordPage,
  },
  {
    path: 'reset',
    component: ResetPasswordPage,
  },
];
