import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/auth.models';

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  oldPassword?: string;
  newPassword?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient) { }

  /**
   * Fetches the profile of the currently logged-in user.
   */
  getMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl}/me`);
  }

  /**
   * Updates the profile of the currently logged-in user.
   * @param dto The data to update.
   */
  updateMe(dto: UpdateProfileDto): Observable<AuthUser> {
    return this.http.patch<AuthUser>(`${this.apiUrl}/me`, dto);
  }
}
