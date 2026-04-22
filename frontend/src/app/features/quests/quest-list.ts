import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuestService } from '../../core/services/quest.service';
import { ClerkService } from '../../core/services/clerk.service';
import { UserService } from '../../core/services/user-notification.service';
import { Quest, CATEGORY_ICONS } from '../../shared/models/quest.model';
import { TitleCasePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { QuestCardComponent } from '../../shared/components/quest-card/quest-card';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-quest-list',
  standalone: true,
  imports: [TitleCasePipe, QuestCardComponent, UtilityRailComponent],
  templateUrl: './quest-list.html',
  styleUrl: './quest-list.css',
})
export class QuestListPage implements OnInit {
  private readonly questSvc = inject(QuestService);
  readonly clerk   = inject(ClerkService);
  readonly userSvc = inject(UserService);
  private readonly router   = inject(Router);

  readonly quests     = signal<Quest[]>([]);
  readonly loading    = signal(true);
  readonly categories = signal<string[]>([]);
  readonly totalCount = signal(0);

  readonly selectedCategory  = signal('');
  readonly selectedDifficulty = signal('');
  readonly searchQuery        = signal('');
  readonly page               = signal(1);
  private searchSubject = new Subject<string>();

  readonly difficulties = ['Easy', 'Medium', 'Hard', 'Legendary'];
  readonly CATEGORY_ICONS = CATEGORY_ICONS;

  ngOnInit() {
    this.questSvc.getCategories().subscribe({ next: (r: any) => this.categories.set(r.categories ?? []) });
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.load(true);
    });
    this.load();
  }

  onSearchInput(q: string) {
    this.searchSubject.next(q);
  }

  load(reset = false) {
    if (reset) this.page.set(1);
    this.loading.set(true);
    this.questSvc.listQuests({
      page: this.page(),
      limit: 12,
      category:   this.selectedCategory() || undefined,
      difficulty: this.selectedDifficulty() || undefined,
      search:     this.searchQuery() || undefined,
    }).subscribe({
      next: (r) => {
        this.quests.set(r.data ?? []);
        this.totalCount.set(r.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  accept(quest: Quest) {
    if (!this.clerk.isSignedIn()) { this.clerk.openSignIn(); return; }
    this.questSvc.acceptQuest(quest._id).subscribe({ next: () => this.load() });
  }

  abandon(quest: Quest) {
    this.questSvc.abandonQuest(quest._id).subscribe({ next: () => this.load() });
  }

  setCategory(c: string)  { this.selectedCategory.set(c);  this.load(true); }
  setDifficulty(d: string){ this.selectedDifficulty.set(d); this.load(true); }
  applySearch(q: string)  { this.searchQuery.set(q);        this.load(true); }
  clearFilters()           { this.selectedCategory.set(''); this.selectedDifficulty.set(''); this.searchQuery.set(''); this.load(true); }

  categoryIcon(cat: string) { return CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] ?? '⚡'; }
}
