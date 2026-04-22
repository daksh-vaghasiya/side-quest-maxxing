import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { LeaderboardService } from '../../core/services/vote-leaderboard.service';
import { UserService } from '../../core/services/user-notification.service';
import { LeaderboardEntry } from '../../shared/models/user.model';
import { BadgeChipComponent } from '../../shared/components/badge-chip/badge-chip';
import { CommonModule } from '@angular/common';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, BadgeChipComponent, CommonModule, UtilityRailComponent],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
})
export class LeaderboardPage implements OnInit {
  private readonly lbSvc   = inject(LeaderboardService);
  private readonly userSvc = inject(UserService);

  readonly entries    = signal<LeaderboardEntry[]>([]);
  readonly loading    = signal(true);
  readonly activeTab  = signal<'global' | 'weekly' | 'monthly'>('global');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const obs =
      this.activeTab() === 'weekly'  ? this.lbSvc.getWeekly()  :
      this.activeTab() === 'monthly' ? this.lbSvc.getMonthly() :
                                       this.lbSvc.getGlobal();

    obs.subscribe({
      next: (r) => { this.entries.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: 'global' | 'weekly' | 'monthly') {
    this.activeTab.set(tab);
    this.load();
  }

  rankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  rankClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  }

  isMe(entry: LeaderboardEntry): boolean {
    const me = this.userSvc.profile();
    return me ? (entry.username === me.username) : false;
  }

  get myEntry() {
    return this.entries().find(e => this.isMe(e));
  }

  get nextPlayer() {
    const entries = this.entries();
    const meIndex = entries.findIndex(e => this.isMe(e));
    if (meIndex > 0) return entries[meIndex - 1];
    return null;
  }

  get xpToOvertake(): number {
    const me = this.myEntry;
    const next = this.nextPlayer;
    if (!me || !next) return 0;
    
    const myXp = this.activeTab() === 'weekly' ? me.weeklyXp : this.activeTab() === 'monthly' ? me.monthlyXp : me.totalXp;
    const nextXp = this.activeTab() === 'weekly' ? next.weeklyXp : this.activeTab() === 'monthly' ? next.monthlyXp : next.totalXp;
    
    return Math.max(0, nextXp - myXp + 1);
  }

  getTrend(id: string): 'up' | 'down' | 'steady' {
    // Deterministic mock trend based on ID for visual flair
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    if (sum % 3 === 0) return 'up';
    if (sum % 3 === 1) return 'steady';
    return 'down';
  }
}
