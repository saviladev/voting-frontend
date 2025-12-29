import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const AUTH_SCREEN_ENDPOINTS = ['/auth/login'];
const LOGOUT_ENDPOINT = '/auth/logout';
const SESSION_INVALID_MESSAGES = new Set(['Session expired', 'Invalid session']);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const isAuthScreenRequest = AUTH_SCREEN_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));
  const isLogoutRequest = req.url.includes(LOGOUT_ENDPOINT);

  const authReq =
    token && !isAuthScreenRequest
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthScreenRequest && !isLogoutRequest) {
        const currentUrl = router.url;
        const inAuthScreen = currentUrl.startsWith('/login');
        const message = typeof error.error?.message === 'string' ? error.error.message : '';
        if (!inAuthScreen) {
          if (SESSION_INVALID_MESSAGES.has(message)) {
            void authService.handleSessionInvalidation();
          } else if (authService.getToken()) {
            void authService.handleSessionExpired();
          }
        }
      }
      return throwError(() => error);
    }),
  );
};
