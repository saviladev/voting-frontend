import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BranchDto, CreateBranchDto } from '../models/structure.models';

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<BranchDto[]> {
    return this.http.get<BranchDto[]>(`${this.apiBaseUrl}/branches`);
  }

  create(dto: CreateBranchDto): Observable<BranchDto> {
    return this.http.post<BranchDto>(`${this.apiBaseUrl}/branches`, dto);
  }

  update(id: string, dto: CreateBranchDto): Observable<BranchDto> {
    return this.http.put<BranchDto>(`${this.apiBaseUrl}/branches/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/branches/${id}`);
  }
}
