import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuestService } from '../../core/services/quest.service';
import { ClerkService } from '../../core/services/clerk.service';
import { CommunityQuest, CATEGORY_ICONS } from '../../shared/models/quest.model';
import { SlicePipe, TitleCasePipe } from '@angular/common';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [FormsModule, SlicePipe, TitleCasePipe, UtilityRailComponent],
  templateUrl: './community.html',
  styleUrl: './community.css',
})
export class CommunityPage implements OnInit {
  private readonly questSvc = inject(QuestService);
  readonly clerk   = inject(ClerkService);

  readonly quests      = signal<CommunityQuest[]>([]);
  readonly loading     = signal(true);
  readonly showForm    = signal(false);
  readonly submitting  = signal(false);
  readonly formError   = signal('');
  readonly formSuccess = signal(false);

  readonly form = signal({
    title: '', description: '', category: 'fitness',
    difficulty: 'Easy', suggestedXpReward: 150, requirements: ''
  });

  readonly CATEGORIES  = Object.keys(CATEGORY_ICONS);
  readonly DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Legendary'];
  readonly CATEGORY_ICONS = CATEGORY_ICONS;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.questSvc.listCommunityQuests({ sort: '-upvoteCount' }).subscribe({
      next: (r) => { this.quests.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  vote(quest: CommunityQuest, dir: 'up' | 'down') {
    if (!this.clerk.isSignedIn()) { this.clerk.openSignIn(); return; }
    this.questSvc.voteOnCommunityQuest(quest._id, dir).subscribe({
      next: (r: any) => {
        this.quests.update(list => list.map(q =>
          q._id === quest._id
            ? { ...q, upvoteCount: r.upvoteCount, downvoteCount: r.downvoteCount,
                hasUpvoted: dir === 'up' ? !q.hasUpvoted : false,
                hasDownvoted: dir === 'down' ? !q.hasDownvoted : false }
            : q
        ));
      },
    });
  }

  updateForm(field: string, value: any) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  submitQuest() {
    const f = this.form();
    if (!f.title || !f.description) { this.formError.set('Title and description required.'); return; }
    if (!this.clerk.isSignedIn()) { this.clerk.openSignIn(); return; }

    this.submitting.set(true);
    this.formError.set('');

    this.questSvc.submitCommunityQuest({
      title: f.title, description: f.description, category: f.category,
      difficulty: f.difficulty, suggestedXpReward: f.suggestedXpReward,
      requirements: f.requirements ? f.requirements.split('\n').filter(Boolean) : [],
    }).subscribe({
      next: () => { this.formSuccess.set(true); this.showForm.set(false); this.load(); },
      error: (e) => { this.formError.set(e?.error?.message || 'Submission failed'); this.submitting.set(false); },
    });
  }

  statusLabel(q: CommunityQuest): string {
    if (q.status === 'auto_approved') return '🔥 Trending';
    if (q.status === 'approved')      return '✅ Approved';
    if (q.status === 'rejected')      return '❌ Rejected';
    return '🗳️ Voting';
  }

  categoryIcon(cat: string) { return CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] ?? '⚡'; }
}
