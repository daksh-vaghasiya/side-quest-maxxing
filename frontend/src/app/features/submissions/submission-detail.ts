import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubmissionService } from '../../core/services/submission.service';
import { VoteService } from '../../core/services/vote-leaderboard.service';
import { ClerkService } from '../../core/services/clerk.service';
import { UserService } from '../../core/services/user-notification.service';
import { Submission, VoteSummary } from '../../shared/models/submission.model';
import { TitleCasePipe, DatePipe } from '@angular/common';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-submission-detail',
  standalone: true,
  imports: [TitleCasePipe, DatePipe, UtilityRailComponent, RouterLink],
  templateUrl: './submission-detail.html',
  styleUrl: './submission-detail.css',
})
export class SubmissionDetailPage implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly submSvc = inject(SubmissionService);
  private readonly voteSvc = inject(VoteService);
  readonly clerk   = inject(ClerkService);
  readonly userSvc = inject(UserService);

  readonly submission = signal<Submission | null>(null);
  readonly voteSummary = signal<VoteSummary | null>(null);
  readonly comments  = signal<any[]>([]);
  readonly loading   = signal(true);
  readonly votingInProgress = signal(false);
  readonly commentText = signal('');
  readonly activeMedia = signal(0);

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.submSvc.getSubmission(id).subscribe({
      next: (r: any) => {
        this.submission.set(r.submission);
        this.voteSummary.set(r.submission.voteSummary);
        this.loading.set(false);
        this.loadComments(id);
      },
      error: () => this.loading.set(false),
    });
  }

  loadComments(id: string) {
    this.submSvc.getComments('submission', id).subscribe({
      next: (r) => this.comments.set(r.data ?? []),
    });
  }

  castVote(voteType: 'legit' | 'not_legit') {
    const sub = this.submission();
    if (!sub || this.votingInProgress()) return;
    if (!this.clerk.isSignedIn()) { this.clerk.openSignIn(); return; }

    this.votingInProgress.set(true);
    this.voteSvc.castVote(sub._id, voteType).subscribe({
      next: (r: any) => {
        this.voteSummary.set(r.summary);
        this.votingInProgress.set(false);
      },
      error: () => this.votingInProgress.set(false),
    });
  }

  toggleLike() {
    const sub = this.submission();
    if (!sub) return;
    this.submSvc.toggleLike(sub._id).subscribe({
      next: (r: any) => {
        this.submission.update(s => s ? { ...s, isLiked: r.isLiked, likeCount: r.likeCount } : s);
      },
    });
  }

  addComment() {
    const sub = this.submission();
    const text = this.commentText().trim();
    if (!sub || !text) return;
    if (!this.clerk.isSignedIn()) { this.clerk.openSignIn(); return; }

    this.submSvc.addComment('submission', sub._id, text).subscribe({
      next: (r: any) => {
        this.comments.update(c => [r.comment, ...c]);
        this.commentText.set('');
      },
    });
  }

  get approvalPct() {
    const v = this.voteSummary();
    return v ? Math.round(v.approvalPct) : 0;
  }

  get voteBarGradient(): string {
    const pct = this.approvalPct;
    return `linear-gradient(90deg, #10B981 ${pct}%, #EF4444 ${pct}%)`;
  }

  get statusColor(): string {
    const s = this.submission()?.status;
    if (s === 'approved') return 'text-neon-green';
    if (s === 'rejected') return 'text-neon-red';
    return 'text-neon-cyan';
  }
}
