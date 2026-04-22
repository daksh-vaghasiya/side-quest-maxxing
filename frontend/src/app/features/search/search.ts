import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClerkService } from '../../core/services/clerk.service';

interface SearchUser {
  _id: string;
  username: string;
  avatar: string;
  level: string;
  xp: number;
  reputation: number;
  bio: string;
  followerCount: number;
  followingCount: number;
  badges: { name: string; icon: string; rarity: string }[];
  isFollowing?: boolean;
  followLoading?: boolean;
}

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, UtilityRailComponent],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class SearchPage implements OnInit {
  private readonly http   = inject(HttpClient);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly clerk = inject(ClerkService);

  readonly query    = signal('');
  readonly results  = signal<SearchUser[]>([]);
  readonly loading  = signal(false);
  readonly searched = signal(false);

  private readonly search$ = new Subject<string>();

  ngOnInit() {
    // Read initial ?q= from URL
    const q = this.route.snapshot.queryParamMap.get('q') || '';
    this.query.set(q);
    if (q) this.doSearch(q);

    // Debounced live search
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term.trim()) {
          this.results.set([]);
          this.searched.set(false);
          this.loading.set(false);
          return of(null);
        }
        this.loading.set(true);
        const params = new HttpParams().set('q', term.trim());
        return this.http.get<any>(`${environment.apiUrl}/auth/search`, { params });
      })
    ).subscribe({
      next: (res) => {
        if (!res) return;
        this.results.set(res.data ?? []);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onInput(value: string) {
    this.query.set(value);
    this.router.navigate([], { queryParams: { q: value || null }, replaceUrl: true });
    this.search$.next(value);
  }

  doSearch(q: string) {
    if (!q.trim()) return;
    this.loading.set(true);
    const params = new HttpParams().set('q', q.trim());
    this.http.get<any>(`${environment.apiUrl}/auth/search`, { params }).subscribe({
      next: (res) => {
        this.results.set(res.data ?? []);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleFollow(user: SearchUser) {
    if (!this.clerk.isSignedIn()) { this.router.navigate(['/sign-in']); return; }
    if (user.followLoading) return;
    user.followLoading = true;

    this.http.post<any>(`${environment.apiUrl}/auth/follow/${user._id}`, {}).subscribe({
      next: (res) => {
        user.isFollowing    = res.following;
        user.followerCount  = res.followerCount;
        user.followLoading  = false;
        this.results.update(list => [...list]); // trigger change detection
      },
      error: () => { user.followLoading = false; },
    });
  }

  levelClass(level: string): string {
    return (level ?? 'Beginner').toLowerCase().replace(' ', '-');
  }
}
