import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; // Corrected path
import { ElectionDto } from '../models/elections.models';

@Injectable({
  providedIn: 'root'
})
export class VotingService {
  private apiUrl = `${environment.apiBaseUrl}/elections`; // Corrected property name

  constructor(private http: HttpClient) { }

  /**
   * Fetches the list of elections that are currently open and eligible
   * for the logged-in member to vote in.
   */
  getVotableElections(): Observable<ElectionDto[]> {
    return this.http.get<ElectionDto[]>(`${this.apiUrl}/votable`);
  }

  /**
   * Submits a vote for a specific candidate in an election.
   * @param electionId The ID of the election.
   * @param candidateId The ID of the candidate to vote for.
   */
  vote(electionId: string, candidateId: string): Observable<{ message: string; voteId: string }> {
    return this.http.post<{ message: string; voteId: string }>(
      `${this.apiUrl}/${electionId}/vote`,
      { candidateId }
    );
  }
}
