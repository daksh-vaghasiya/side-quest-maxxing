import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe, SlicePipe } from '@angular/common';
import { Quest, CATEGORY_ICONS } from '../../models/quest.model';

@Component({
  selector: 'app-quest-card',
  standalone: true,
  imports: [RouterLink, TitleCasePipe, SlicePipe],
  templateUrl: './quest-card.html',
  styleUrl: './quest-card.css',
})
export class QuestCardComponent {
  @Input({ required: true }) quest!: Quest;
  @Input() showActions = true;
  @Output() accept    = new EventEmitter<Quest>();
  @Output() abandon   = new EventEmitter<Quest>();

  get categoryIcon(): string {
    return CATEGORY_ICONS[this.quest.category] ?? '⚡';
  }

  get difficultyColors(): string {
    return `difficulty-${this.quest.difficulty}`;
  }

  get xpColor(): string {
    if (this.quest.xpReward >= 500) return 'var(--accent-primary)';
    if (this.quest.xpReward >= 200) return 'var(--accent-secondary)';
    if (this.quest.xpReward >= 100) return 'var(--status-success)';
    return 'var(--text-mute)';
  }
}
