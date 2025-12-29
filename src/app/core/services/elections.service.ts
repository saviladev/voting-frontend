import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateCandidateDto, CreateCandidateListDto, CreateElectionDto, ElectionDto } from '../models/elections.models';

@Injectable({ providedIn: 'root' })
export class ElectionsService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<ElectionDto[]> {
    return this.http.get<ElectionDto[]>(`${this.apiBaseUrl}/elections`);
  }

  get(id: string): Observable<ElectionDto> {
    return this.http.get<ElectionDto>(`${this.apiBaseUrl}/elections/${id}`);
  }

  create(dto: CreateElectionDto): Observable<ElectionDto> {
    return this.http.post<ElectionDto>(`${this.apiBaseUrl}/elections`, dto);
  }

  createList(electionId: string, dto: CreateCandidateListDto): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/elections/${electionId}/lists`, dto);
  }

  addCandidate(listId: string, dto: CreateCandidateDto): Observable<any> {
      return this.http.post(`${this.apiBaseUrl}/elections/lists/${listId}/candidates`, dto);
  }

  update(id: string, data: Partial<ElectionDto>): Observable<ElectionDto> {
    return this.http.put<ElectionDto>(`${this.apiBaseUrl}/elections/${id}`, data);
  }

  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/elections/lists/${listId}`);
  }

  updateCandidate(candidateId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/elections/candidates/${candidateId}`, data);
  }

  deleteCandidate(candidateId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/elections/candidates/${candidateId}`);
  }
}
