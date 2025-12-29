import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginDto, LoginResponseDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'auth.token';
  private readonly userKey = 'auth.user';
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  private token: string | null = null;
  private hydrated = false;
  private handlingSessionLoss = false;

  readonly user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController,
  ) {}

  async hydrate(): Promise<void> {
    const token = localStorage.getItem(this.tokenKey);
    const userRaw = localStorage.getItem(this.userKey);
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AuthUser;
        this.setSession(token, user);
      } catch {
        this.clearSession();
      }
    } else {
      this.clearSession();
    }
    this.hydrated = true;
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  isAuthenticated(): boolean {
    return Boolean(this.token && this.userSubject.value);
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): AuthUser | null {
    return this.userSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.userSubject.value;
    return Boolean(user && user.roles.includes(role));
  }

  login(dto: LoginDto): Observable<AuthUser> {
    return this.http.post<LoginResponseDto>(`${this.apiBaseUrl}/auth/login`, dto).pipe(
      tap((response) => {
        this.setSession(response.accessToken, response.user);
      }),
      map((response) => response.user),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/auth/logout`, {}).pipe(
      catchError(() => of(void 0)),
      tap(() => {
        this.clearSession();
      }),
    );
  }

  async handleSessionInvalidation(): Promise<void> {
    await this.handleSessionLoss('Tu sesión se cerró porque iniciaste sesión en otro dispositivo.');
  }

  async handleSessionExpired(): Promise<void> {
    await this.handleSessionLoss('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  private async handleSessionLoss(message: string): Promise<void> {
    if (this.handlingSessionLoss) {
      return;
    }
    this.handlingSessionLoss = true;
    this.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
    const toast = await this.toastController.create({
      message,
      duration: 3500,
      color: 'medium',
    });
    await toast.present();
  }

  private setSession(token: string, user: AuthUser): void {
    this.token = token;
    this.userSubject.next(user);
    this.handlingSessionLoss = false;
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private clearSession(): void {
    this.token = null;
    this.userSubject.next(null);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}
