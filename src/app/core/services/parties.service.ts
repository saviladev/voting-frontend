import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePartyDto, PartyDto } from '../models/parties.models';

@Injectable({ providedIn: 'root' })
export class PartiesService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<PartyDto[]> {
    return this.http.get<PartyDto[]>(`${this.apiBaseUrl}/parties`);
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
