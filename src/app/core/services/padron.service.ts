import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PadronImportResultDto {
  created: number;
  updated: number;
  disabled: number;
  skipped: number;
  rejected: string[];
  message?: string;
  skippedDetails?: { dni?: string; reason: string }[];
}

@Injectable({ providedIn: 'root' })
export class PadronService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  import(file: File): Observable<PadronImportResultDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PadronImportResultDto>(`${this.apiBaseUrl}/padron/import`, formData);
  }

  disable(file: File): Observable<PadronImportResultDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PadronImportResultDto>(`${this.apiBaseUrl}/padron/disable`, formData);
  }
}
