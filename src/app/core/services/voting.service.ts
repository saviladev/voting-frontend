import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ElectionDto, BulkVoteDto, VoteSelectionDto } from '../models/elections.models';

@Injectable({
  providedIn: 'root'
})
export class VotingService {
  private apiUrl = `${environment.apiBaseUrl}/elections`;

  constructor(private http: HttpClient) { }

  /**
   * Fetches the list of elections that are currently open and eligible
   * for the logged-in member to vote in.
   * The backend will return an array of elections, where each election
   * may have a `votedPositionIds` property.
   */
  getVotableElections(): Observable<ElectionDto[]> {
    return this.http.get<ElectionDto[]>(`${this.apiUrl}/votable`);
  }

  /**
   * Submits a batch of votes for a single election.
   * @param electionId The ID of the election.
   * @param selections An array of objects containing candidate and position IDs.
   */
  bulkVote(electionId: string, selections: VoteSelectionDto[]): Observable<{ message: string; count: number }> {
    const payload: BulkVoteDto = { selections };
    return this.http.post<{ message: string; count: number }>(
      `${this.apiUrl}/${electionId}/bulk-vote`,
      payload
    );
  }
}
