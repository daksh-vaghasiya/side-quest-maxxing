import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Submission, VoteSummary, Comment, PaginatedResponse, ApiResponse } from '../../shared/models/submission.model';

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  private readonly api = inject(ApiService);

  createSubmission(formData: FormData): Observable<ApiResponse> {
    return this.api.postForm('/submissions', formData);
  }

  getFeed(params: { page?: number; limit?: number; category?: string; status?: string } = {}): Observable<PaginatedResponse<Submission>> {
    return this.api.get('/submissions/feed', params);
  }

  getMySubmissions(params: { page?: number; status?: string } = {}): Observable<PaginatedResponse<Submission>> {
    return this.api.get('/submissions/my', params);
  }

  getSubmission(id: string): Observable<ApiResponse> {
    return this.api.get(`/submissions/${id}`);
  }

  listSubmissions(params: { page?: number; status?: string; questId?: string; userId?: string } = {}): Observable<PaginatedResponse<Submission>> {
    return this.api.get('/submissions', params);
  }

  toggleLike(id: string): Observable<ApiResponse> {
    return this.api.post(`/submissions/${id}/like`);
  }

  flagSubmission(id: string, reason: string): Observable<ApiResponse> {
    return this.api.post(`/submissions/${id}/flag`, { reason });
  }

  // Comments
  getComments(targetType: string, targetId: string, page = 1): Observable<PaginatedResponse<Comment>> {
    return this.api.get(`/comments/${targetType}/${targetId}`, { page });
  }

  addComment(targetType: string, targetId: string, text: string, parentId?: string): Observable<ApiResponse> {
    return this.api.post(`/comments/${targetType}/${targetId}`, { text, parentId });
  }

  deleteComment(id: string): Observable<ApiResponse> {
    return this.api.delete(`/comments/${id}`);
  }

  toggleCommentLike(id: string): Observable<ApiResponse> {
    return this.api.post(`/comments/${id}/like`);
  }
}
