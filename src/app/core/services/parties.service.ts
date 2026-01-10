import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePartyDto, PartyDto } from '../models/parties.models';

export interface PartyFilters {
  scope?: string;
  associationId?: string;
  branchId?: string;
  chapterId?: string;
}

@Injectable({ providedIn: 'root' })
export class PartiesService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(filters?: PartyFilters): Observable<PartyDto[]> {
    let params = new HttpParams();
    if (filters?.scope) params = params.set('scope', filters.scope);
    if (filters?.associationId) params = params.set('associationId', filters.associationId);
    if (filters?.branchId) params = params.set('branchId', filters.branchId);
    if (filters?.chapterId) params = params.set('chapterId', filters.chapterId);
    
    return this.http.get<PartyDto[]>(`${this.apiBaseUrl}/parties`, { params });
  }

  create(dto: CreatePartyDto): Observable<PartyDto> {
    return this.http.post<PartyDto>(`${this.apiBaseUrl}/parties`, dto);
  }

  update(id: string, dto: CreatePartyDto): Observable<PartyDto> {
    return this.http.put<PartyDto>(`${this.apiBaseUrl}/parties/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/parties/${id}`);
  }
}
