import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChapterDto, CreateChapterDto } from '../models/structure.models';

@Injectable({ providedIn: 'root' })
export class ChaptersService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<ChapterDto[]> {
    return this.http.get<ChapterDto[]>(`${this.apiBaseUrl}/chapters`);
  }

  create(dto: CreateChapterDto): Observable<ChapterDto> {
    return this.http.post<ChapterDto>(`${this.apiBaseUrl}/chapters`, dto);
  }

  update(id: string, dto: CreateChapterDto): Observable<ChapterDto> {
    return this.http.put<ChapterDto>(`${this.apiBaseUrl}/chapters/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/chapters/${id}`);
  }
}
