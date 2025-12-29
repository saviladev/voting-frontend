import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateSpecialtyDto, SpecialtyDto } from '../models/structure.models';

@Injectable({ providedIn: 'root' })
export class SpecialtiesService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<SpecialtyDto[]> {
    return this.http.get<SpecialtyDto[]>(`${this.apiBaseUrl}/specialties`);
  }

  create(dto: CreateSpecialtyDto): Observable<SpecialtyDto> {
    return this.http.post<SpecialtyDto>(`${this.apiBaseUrl}/specialties`, dto);
  }

  update(id: string, dto: CreateSpecialtyDto): Observable<SpecialtyDto> {
    return this.http.put<SpecialtyDto>(`${this.apiBaseUrl}/specialties/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/specialties/${id}`);
  }
}
