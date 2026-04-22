import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User, XpProgress } from '../../shared/models/user.model';
import { ApiResponse, Notification, PaginatedResponse } from '../../shared/models/submission.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  // Current user state
  private readonly _profile   = signal<User | null>(null);
  private readonly _xpProgress = signal<XpProgress | null>(null);
  private readonly _rank      = signal<number | null>(null);

  readonly profile    = this._profile.asReadonly();
  readonly xpProgress = this._xpProgress.asReadonly();
  readonly rank       = this._rank.asReadonly();

  syncUser(username: string, email: string, avatar?: string): Observable<ApiResponse> {
    return this.api.post<ApiResponse>('/auth/sync', { username, email, avatar }).pipe(
      tap((res: any) => {
        if (res.success) {
          this._profile.set(res.user);
          this._xpProgress.set(res.xpProgress);
          this._rank.set(res.rank);
        }
      })
    );
  }

  getMe(): Observable<ApiResponse> {
    return this.api.get<ApiResponse>('/auth/me').pipe(
      tap((res: any) => {
        if (res.success) {
          this._profile.set(res.user);
          this._xpProgress.set(res.xpProgress);
          this._rank.set(res.rank);
        }
      })
    );
  }

  updateProfile(data: { username?: string; bio?: string }): Observable<ApiResponse> {
    return this.api.patch<ApiResponse>('/auth/me', data).pipe(
      tap((res: any) => { if (res.success) this._profile.set(res.user); })
    );
  }

  updateAvatar(formData: FormData): Observable<ApiResponse> {
    return this.api.patchForm<ApiResponse>('/auth/me/avatar', formData).pipe(
      tap((res: any) => { if (res.success) this._profile.set(res.user); })
    );
  }

  updateFullProfile(formData: FormData): Observable<ApiResponse> {
    return this.api.putForm<ApiResponse>('/user/profile', formData).pipe(
      tap((res: any) => { if (res.success && res.user) { this._profile.set(res.user); } })
    );
  }

  getPublicProfile(username: string): Observable<ApiResponse> {
    return this.api.get<ApiResponse>(`/auth/profile/${username}`);
  }

  toggleFollow(userId: string): Observable<any> {
    return this.api.post<any>(`/auth/follow/${userId}`, {});
  }

  getFollowers(userId: string): Observable<any> {
    return this.api.get<any>(`/auth/followers/${userId}`);
  }

  getFollowing(userId: string): Observable<any> {
    return this.api.get<any>(`/auth/following/${userId}`);
  }

  clearProfile(): void {
    this._profile.set(null);
    this._xpProgress.set(null);
    this._rank.set(null);
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);
  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  getNotifications(page = 1, unread?: boolean): Observable<PaginatedResponse<Notification>> {
    const params: any = { page };
    if (unread) params.unread = true;
    return this.api.get<PaginatedResponse<Notification>>('/notifications', params);
  }

  getUnreadCount(): Observable<ApiResponse> {
    return this.api.get<ApiResponse>('/notifications/unread-count').pipe(
      tap((res: any) => { if (res.success) this._unreadCount.set(res.unreadCount); })
    );
  }

  markAllRead(): Observable<ApiResponse> {
    return this.api.patch<ApiResponse>('/notifications/mark-all-read').pipe(
      tap(() => this._unreadCount.set(0))
    );
  }

  markOneRead(id: string): Observable<ApiResponse> {
    return this.api.patch<ApiResponse>(`/notifications/${id}/read`);
  }

  delete(id: string): Observable<ApiResponse> {
    return this.api.delete<ApiResponse>(`/notifications/${id}`);
  }
}
