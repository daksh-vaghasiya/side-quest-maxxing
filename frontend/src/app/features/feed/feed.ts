import { Component, inject, signal, effect, OnInit, untracked } from '@angular/core';
import { SubmissionService } from '../../core/services/submission.service';
import { VoteService } from '../../core/services/vote-leaderboard.service';
import { ClerkService } from '../../core/services/clerk.service';
import { UserService } from '../../core/services/user-notification.service';
import { Submission } from '../../shared/models/submission.model';
import { RouterLink, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [RouterLink, DecimalPipe, UtilityRailComponent],
  templateUrl: './feed.html',
  styleUrl: './feed.css',
})
export class FeedPage implements OnInit {
  private readonly submSvc = inject(SubmissionService);
  private readonly voteSvc = inject(VoteService);
  private readonly router  = inject(Router);
  readonly clerk   = inject(ClerkService);
  readonly userSvc = inject(UserService);

  readonly submissions  = signal<Submission[]>([]);
  readonly loading      = signal(true);
  readonly page         = signal(1);
  readonly hasMore      = signal(true);
  readonly activeFilter = signal('all');

  // Sidebar / Global Stats
  readonly sidebarStats = signal({
    totalValidations: 0,
    activeQuesters: 0,
    averageTrust: 0
  });

  // Inline Comment State
  readonly commentInputs = signal<Record<string, string>>({});
  readonly postingComment = signal<string[]>([]);

  /** IDs of submissions with an in-flight vote request */
  readonly votingIds = signal<string[]>([]);

  readonly filters = [
    { key: 'all',         label: '🌊 All' },
    { key: 'pending',     label: '🗳️ Vote Now' },
    { key: 'fitness',     label: '🏋️ Fitness' },
    { key: 'mindfulness', label: '🧘 Mind' },
    { key: 'creativity',  label: '🎨 Create' },
    { key: 'social',      label: '🤝 Social' },
    { key: 'outdoor',     label: '🌄 Outdoor' },
    { key: 'tech',        label: '💻 Tech' },
  ];

  constructor() {
    // Re-load feed when auth state is confirmed or changed
    // Tracking this.clerk.user() directly ensures we re-fetch if identity shifts
    effect(() => {
      const u = this.clerk.user(); 
      const isLoaded = this.clerk.isLoaded();
      
      if (isLoaded) {
        // Use untracked to prevent infinite loops if load() modifies signals
        untracked(() => this.load(true));
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {}

  load(reset = false) {
    if (reset) {
      this.page.set(1);
      this.submissions.set([]);
    }
    this.loading.set(true);

    const params: any = { page: this.page(), limit: 12 };
    // 'pending' key maps to status filter; category keys pass as category param
    if (this.activeFilter() === 'pending') {
      params.status = 'pending';
    } else if (this.activeFilter() !== 'all') {
      params.category = this.activeFilter();
    }

    this.submSvc.getFeed(params).subscribe({
      next: (r) => {
        if (reset) this.submissions.set(r.data ?? []);
        else this.submissions.update(s => [...s, ...(r.data ?? [])]);
        this.hasMore.set(r.pagination?.hasNextPage ?? false);
        this.loading.set(false);
        this.updateSidebarStats();
      },
      error: () => this.loading.set(false),
    });
  }

  private updateSidebarStats() {
    const subs = this.submissions();
    if (subs.length === 0) return;
    
    const approved = subs.filter(s => s.status === 'approved').length;
    const avgTrust = subs.reduce((acc, s) => acc + s.approvalPct, 0) / subs.length;
    
    this.sidebarStats.set({
      totalValidations: subs.reduce((acc, s) => acc + s.rawVoteCount, 0),
      activeQuesters: new Set(subs.map(s => (s.userId as any)?._id || s.userId)).size,
      averageTrust: Math.round(avgTrust)
    });
  }

  setFilter(key: string) {
    this.activeFilter.set(key);
    this.load(true);
  }

  loadMore() {
    this.page.update(p => p + 1);
    this.load(false);
  }

  toggleLike(sub: Submission) {
    if (!this.clerk.isSignedIn()) { this.router.navigate(['/sign-in']); return; }
    this.submSvc.toggleLike(sub._id).subscribe({
      next: (r: any) => {
        this.submissions.update(list =>
          list.map(s => s._id === sub._id ? { ...s, isLiked: r.isLiked, likeCount: r.likeCount } : s)
        );
      },
    });
  }

  /**
   * Cast, change, or retract an inline vote directly from the feed card.
   * Same vote = retract. Different vote = change. No vote = new vote.
   */
  castFeedVote(sub: Submission, voteType: 'legit' | 'not_legit', event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.clerk.isSignedIn()) { this.router.navigate(['/sign-in']); return; }

    const id = sub._id;
    if (this.votingIds().includes(id)) return; // prevent double-tap
    this.votingIds.update(ids => [...ids, id]);

    this.voteSvc.castVote(id, voteType).subscribe({
      next: (r: any) => {
        this.votingIds.update(ids => ids.filter(x => x !== id));
        const s = r.summary;
        this.submissions.update(list => list.map(item =>
          item._id !== id ? item : {
            ...item,
            legitimVotes:  s.legitimVotes,
            notLegitVotes: s.notLegitVotes,
            approvalPct:   s.approvalPct,
            rawVoteCount:  s.rawVoteCount,
            hasUserVoted:  s.userVote,
          }
        ));
      },
      error: () => this.votingIds.update(ids => ids.filter(x => x !== id)),
    });
  }

  /** Returns the current user's vote direction for a submission, or null */
  userVote(sub: Submission): 'legit' | 'not_legit' | null {
    return sub.hasUserVoted ?? null;
  }

  /** True while a vote request is in-flight for this submission */
  isVoting(sub: Submission): boolean {
    return this.votingIds().includes(sub._id);
  }

  isVideo(sub: Submission, idx = 0) {
    return sub.mediaTypes?.[idx] === 'video';
  }

  questTitle(sub: Submission): string {
    const q = sub.questId as any;
    return typeof q === 'object' ? q.title : 'Quest';
  }

  questLink(sub: Submission): any[] {
    const q = sub.questId as any;
    const id = (typeof q === 'object' && q._id) ? q._id : sub.questId;
    return ['/quests', id];
  }

  submitterName(sub: Submission): string {
    const u = sub.userId as any;
    return typeof u === 'object' ? u.username : 'User';
  }

  submitterAvatar(sub: Submission): string {
    const u = sub.userId as any;
    return (typeof u === 'object' && u.avatar) ? u.avatar : 'https://api.dicebear.com/7.x/avataaars/svg?seed=user';
  }

  submitterLevel(sub: Submission): string {
    const u = sub.userId as any;
    return typeof u === 'object' ? u.level : 'Beginner';
  }

  // --- Inline Comments ---
  onCommentInput(subId: string, text: string) {
    this.commentInputs.update(prev => ({ ...prev, [subId]: text }));
  }

  postQuickComment(sub: Submission) {
    const text = this.commentInputs()[sub._id]?.trim();
    if (!text || !this.clerk.isSignedIn()) return;

    this.postingComment.update(ids => [...ids, sub._id]);
    this.submSvc.addComment('submission', sub._id, text).subscribe({
      next: (res: any) => {
        // Clear input
        this.commentInputs.update(prev => ({ ...prev, [sub._id]: '' }));
        this.postingComment.update(ids => ids.filter(id => id !== sub._id));
        // Update local comment count
        this.submissions.update(list => list.map(s => 
          s._id === sub._id ? { ...s, commentCount: (s.commentCount || 0) + 1 } : s
        ));
      },
      error: () => this.postingComment.update(ids => ids.filter(id => id !== sub._id))
    });
  }
}
