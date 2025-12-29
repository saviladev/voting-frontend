import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLogDto } from '../models/audit.models';

export interface AuditLogQuery {
  limit?: number;
  action?: string;
  entity?: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  listLogs(query: AuditLogQuery = {}): Observable<AuditLogDto[]> {
    const params = new URLSearchParams();
    if (query.limit) {
      params.set('limit', String(query.limit));
    }
    if (query.action) {
      params.set('action', query.action);
    }
    if (query.entity) {
      params.set('entity', query.entity);
    }
    if (query.userId) {
      params.set('userId', query.userId);
    }
    const queryString = params.toString();
    const url = queryString ? `${this.apiBaseUrl}/audit/logs?${queryString}` : `${this.apiBaseUrl}/audit/logs`;
    return this.http.get<AuditLogDto[]>(url);
  }
}
