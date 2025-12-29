import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssociationDto, CreateAssociationDto } from '../models/structure.models';

@Injectable({ providedIn: 'root' })
export class AssociationsService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<AssociationDto[]> {
    return this.http.get<AssociationDto[]>(`${this.apiBaseUrl}/associations`);
  }

  create(dto: CreateAssociationDto): Observable<AssociationDto> {
    return this.http.post<AssociationDto>(`${this.apiBaseUrl}/associations`, dto);
  }

  update(id: string, dto: CreateAssociationDto): Observable<AssociationDto> {
    return this.http.put<AssociationDto>(`${this.apiBaseUrl}/associations/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/associations/${id}`);
  }
}
