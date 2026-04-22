import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PaginatedResponse } from '../../shared/models/submission.model';
import { LeaderboardEntry } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class VoteService {
  private readonly api = inject(ApiService);

  castVote(submissionId: string, voteType: 'legit' | 'not_legit'): Observable<ApiResponse> {
    return this.api.post(`/votes/${submissionId}`, { voteType });
  }

  getVotes(submissionId: string): Observable<ApiResponse> {
    return this.api.get(`/votes/${submissionId}`);
  }

  getMyVotes(page = 1): Observable<PaginatedResponse<any>> {
    return this.api.get('/votes/my', { page });
  }
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly api = inject(ApiService);

  getGlobal(page = 1, limit = 50): Observable<PaginatedResponse<LeaderboardEntry>> {
    return this.api.get('/leaderboard', { page, limit });
  }

  getWeekly(page = 1): Observable<PaginatedResponse<LeaderboardEntry>> {
    return this.api.get('/leaderboard/weekly', { page });
  }

  getMonthly(page = 1): Observable<PaginatedResponse<LeaderboardEntry>> {
    return this.api.get('/leaderboard/monthly', { page });
  }

  getMyRank(): Observable<ApiResponse> {
    return this.api.get('/leaderboard/me');
  }

  getUserRank(username: string): Observable<ApiResponse> {
    return this.api.get(`/leaderboard/user/${username}`);
  }
}
