import { Component, inject, signal, OnInit, effect, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { UserService, NotificationService } from '../../core/services/user-notification.service';
import { QuestService } from '../../core/services/quest.service';
import { SubmissionService } from '../../core/services/submission.service';
import { ClerkService } from '../../core/services/clerk.service';
import { XpBarComponent } from '../../shared/components/xp-bar/xp-bar';
import { BadgeChipComponent } from '../../shared/components/badge-chip/badge-chip';
import { QuestCardComponent } from '../../shared/components/quest-card/quest-card';
import { Quest } from '../../shared/models/quest.model';
import { Submission } from '../../shared/models/submission.model';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, XpBarComponent, BadgeChipComponent, QuestCardComponent, UtilityRailComponent],
  templateUrl: './dashboard.html',
  styleUrl:    './dashboard.css',
})
export class DashboardPage implements OnInit {
  readonly userSvc    = inject(UserService);
  readonly notifSvc   = inject(NotificationService);
  readonly questSvc   = inject(QuestService);
  readonly submSvc    = inject(SubmissionService);
  readonly clerk      = inject(ClerkService);

  readonly activeQuests   = signal<Quest[]>([]);
  readonly recentSubs     = signal<Submission[]>([]);
  readonly loading        = signal(true);
  readonly activeTab      = signal<'active' | 'completed'>('active');

  constructor() {
    // Reactive Sync: Keep dashboard data fresh as profile/auth state evolves
    effect(() => {
      const u = this.clerk.user();
      const p = this.userSvc.profile();
      if (this.clerk.isLoaded()) {
        untracked(() => this.loadData());
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.userSvc.getMe().subscribe();
  }

  loadData() {
    const profile = this.userSvc.profile();
    if (!profile) return;

    this.loading.set(true);

    // 1. Active Quests (derived directly from populated profile)
    const accepted = (profile.acceptedQuests || []) as Quest[];
    this.activeQuests.set(accepted.slice(0, 6)); // Show up to 6 active

    // 2. Recent Submissions
    this.submSvc.getMySubmissions({ page: 1 }).subscribe({
      next: (r) => {
        this.recentSubs.set(r.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onAcceptQuest(quest: Quest) {
    this.questSvc.acceptQuest(quest._id).subscribe({
      next: () => this.userSvc.getMe().subscribe(() => this.loadData()),
    });
  }

  onAbandonQuest(quest: Quest) {
    this.questSvc.abandonQuest(quest._id).subscribe({
      next: () => this.userSvc.getMe().subscribe(() => this.loadData()),
    });
  }

  get streak() { return this.userSvc.profile()?.currentStreak ?? 0; }
  get level()  { return this.userSvc.profile()?.level ?? 'Beginner'; }
  get xp()     { return this.userSvc.profile()?.xp ?? 0; }

  get levelIcon(): string {
    const icons: Record<string, string> = { Beginner: '🌱', Intermediate: '⚡', Pro: '💎', Legend: '👑' };
    return icons[this.level] ?? '🌱';
  }

  statusLabel(s: Submission) {
    if (s.status === 'approved') return '✅ Approved';
    if (s.status === 'rejected') return '❌ Rejected';
    return `🗳️ ${s.rawVoteCount} votes`;
  }
  statusClass(s: Submission) {
    if (s.status === 'approved') return 'text-neon-green';
    if (s.status === 'rejected') return 'text-neon-red';
    return 'text-neon-cyan';
  }

  getQuestTitle(s: Submission): string {
    const q = s.questId as any;
    return (typeof q === 'object' && q?.title) ? q.title : 'Quest Submission';
  }
}
