import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Quest, CommunityQuest } from '../../shared/models/quest.model';
import { PaginatedResponse, ApiResponse } from '../../shared/models/submission.model';

@Injectable({ providedIn: 'root' })
export class QuestService {
  private readonly api = inject(ApiService);

  getCategories(): Observable<ApiResponse> {
    return this.api.get('/quests/categories');
  }

  listQuests(params: {
    category?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    isOfficial?: boolean;
  } = {}): Observable<PaginatedResponse<Quest>> {
    return this.api.get('/quests', params);
  }

  getQuest(id: string): Observable<ApiResponse> {
    return this.api.get(`/quests/${id}`);
  }

  acceptQuest(id: string): Observable<ApiResponse> {
    return this.api.post(`/quests/${id}/accept`);
  }

  abandonQuest(id: string): Observable<ApiResponse> {
    return this.api.post(`/quests/${id}/abandon`);
  }

  // Community quests
  listCommunityQuests(params: { page?: number; category?: string; sort?: string } = {}): Observable<PaginatedResponse<CommunityQuest>> {
    return this.api.get('/community-quests', params);
  }

  getCommunityQuest(id: string): Observable<ApiResponse> {
    return this.api.get(`/community-quests/${id}`);
  }

  submitCommunityQuest(data: {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    suggestedXpReward: number;
    requirements?: string[];
    tags?: string[];
  }): Observable<ApiResponse> {
    return this.api.post('/community-quests', data);
  }

  voteOnCommunityQuest(id: string, direction: 'up' | 'down'): Observable<ApiResponse> {
    return this.api.post(`/community-quests/${id}/vote`, { direction });
  }
}
