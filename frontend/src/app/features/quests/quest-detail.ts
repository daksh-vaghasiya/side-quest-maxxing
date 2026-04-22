import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuestService } from '../../core/services/quest.service';
import { ClerkService } from '../../core/services/clerk.service';
import { Quest, CATEGORY_ICONS } from '../../shared/models/quest.model';
import { DecimalPipe } from '@angular/common';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-quest-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe, UtilityRailComponent],
  template: `
    <div class="main-layout-grid">
      <section class="content-column fade-up">
        @if (loading()) {
          <div class="skeleton" style="height:300px; border-radius:var(--radius-lg); margin-bottom:var(--s-16);"></div>
        } @else if (quest()) {
          <div class="quest-detail">
            <!-- Header -->
            <div class="detail-header premium-card">
              <div class="detail-top">
                <span class="category-chip">{{ categoryIcon() }} {{ quest()!.category }}</span>
                <span class="level-badge" [class]="'difficulty-' + quest()!.difficulty">{{ quest()!.difficulty }}</span>
                @if (!quest()!.isOfficial) { <span class="community-tag">🌐 Community</span> }
              </div>
              <h1 class="detail-title">{{ quest()!.title }}</h1>
              <p class="detail-desc">{{ quest()!.description }}</p>

              <div class="detail-stats">
                <div class="d-stat"><span class="d-stat-v neon-xp">+{{ quest()!.xpReward | number }} XP</span><span class="d-stat-l">Reward</span></div>
                <div class="d-stat"><span class="d-stat-v">{{ quest()!.completedCount }}</span><span class="d-stat-l">Completed</span></div>
                <div class="d-stat"><span class="d-stat-v">{{ quest()!.acceptedCount }}</span><span class="d-stat-l">Active</span></div>
                <div class="d-stat"><span class="d-stat-v">{{ quest()!.submissionCount }}</span><span class="d-stat-l">Submissions</span></div>
              </div>

              <!-- Action -->
              <div class="detail-actions">
                @if (quest()!.userStatus === 'completed') {
                  <span class="completed-badge">✅ You completed this quest!</span>
                } @else if (quest()!.userStatus === 'accepted') {
                  <a [routerLink]="'/submit/' + quest()!._id" class="neon-btn">📸 Upload Proof</a>
                  <button class="neon-btn-outline" (click)="abandon()">Abandon</button>
                } @else {
                  <button class="neon-btn big" (click)="accept()">⚔️ Accept This Quest</button>
                }
              </div>
            </div>

            <!-- Requirements -->
            @if (quest()!.requirements.length) {
              <div class="premium-card req-card">
                <h3 class="req-title">📋 Requirements</h3>
                <ul class="req-list">
                  @for (req of quest()!.requirements; track req) {
                    <li>{{ req }}</li>
                  }
                </ul>
              </div>
            }

            <!-- Tags -->
            @if (quest()!.tags.length) {
              <div class="tags-wrap">
                @for (tag of quest()!.tags; track tag) {
                  <span class="tag">#{{ tag }}</span>
                }
              </div>
            }
          </div>
        }
      </section>

      <!-- RIGHT: Persistent Utility Rail -->
      <app-utility-rail />
    </div>
  `,
  styles: [`
    .quest-detail { display: flex; flex-direction: column; gap: 1.25rem; }
    .detail-header { padding: 2rem; border-radius: 16px; }
    .detail-top { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; }
    .category-chip { font-size: 0.8rem; font-weight: 600; color: #94A3B8; background: rgba(255,255,255,0.05); padding: 0.25rem 0.7rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.06); }
    .community-tag { font-size: 0.75rem; color: #06B6D4; background: rgba(6,182,212,0.1); padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid rgba(6,182,212,0.2); }
    .detail-title { font-family: 'Rajdhani', sans-serif; font-size: 2rem; font-weight: 700; color: #F8FAFC; margin: 0 0 1rem; }
    .detail-desc  { color: #94A3B8; line-height: 1.7; margin: 0 0 1.5rem; }
    .detail-stats { display: flex; gap: 2rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .d-stat { display: flex; flex-direction: column; gap: 0.15rem; }
    .d-stat-v { font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; font-weight: 700; color: #F8FAFC; }
    .neon-xp  { color: #A855F7; }
    .d-stat-l { font-size: 0.72rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; }
    .detail-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .neon-btn.big { padding: 0.85rem 2rem; font-size: 1rem; }
    .completed-badge { font-family: 'Rajdhani', sans-serif; font-size: 1rem; font-weight: 700; color: #10B981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 0.65rem 1.25rem; border-radius: 10px; }
    .req-card { padding: 1.5rem; border-radius: 16px; }
    .req-title { font-family: 'Rajdhani', sans-serif; font-size: 1.1rem; font-weight: 700; color: #F8FAFC; margin: 0 0 1rem; }
    .req-list { padding-left: 1.5rem; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .req-list li { color: #94A3B8; font-size: 0.9rem; }
    .tags-wrap { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .tag { font-size: 0.78rem; color: #7C3AED; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2); padding: 0.2rem 0.65rem; border-radius: 999px; }
  `],
})
export class QuestDetailPage implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly questSvc = inject(QuestService);
  readonly clerk    = inject(ClerkService);

  readonly quest   = signal<Quest | null>(null);
  readonly loading = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.questSvc.getQuest(id).subscribe({
      next: (r: any) => { this.quest.set(r.quest); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  categoryIcon() { return CATEGORY_ICONS[this.quest()?.category as keyof typeof CATEGORY_ICONS] ?? '⚡'; }

  accept() {
    if (!this.clerk.isSignedIn()) { this.clerk.openSignIn(); return; }
    const q = this.quest();
    if (!q) return;
    this.questSvc.acceptQuest(q._id).subscribe({
      next: () => this.quest.update(qs => qs ? { ...qs, userStatus: 'accepted' } : qs),
    });
  }

  abandon() {
    const q = this.quest();
    if (!q) return;
    this.questSvc.abandonQuest(q._id).subscribe({
      next: () => this.quest.update(qs => qs ? { ...qs, userStatus: 'none' } : qs),
    });
  }
}
