import { Component, Input } from '@angular/core';
import { Badge } from '../../models/user.model';

@Component({
  selector: 'app-badge-chip',
  standalone: true,
  template: `
    <div class="badge-chip" 
         [class]="'rarity-' + badge.rarity" 
         [class.size-sm]="size === 'sm'"
         [title]="badge.name + ': ' + badge.description">
      <span class="badge-icon">{{ badge.icon }}</span>
      @if (showName) {
        <span class="badge-name">{{ badge.name }}</span>
      }
    </div>
  `,
  styles: [`
    .badge-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--s-4);
      padding: var(--s-4) var(--s-12);
      border-radius: var(--radius-full);
      border: 1px solid var(--clr-border);
      background: rgba(255, 255, 255, 0.04);
      cursor: default;
      transition: var(--trans-smooth);
      font-size: 0.8rem;
      backdrop-filter: blur(4px);
    }
    .badge-chip:hover { 
      transform: translateY(-2px) scale(1.05);
      border-color: var(--accent-primary);
    }
    .badge-icon { font-size: 1rem; }
    .badge-name { 
      font-family: var(--font-heading); 
      font-weight: 600; 
      color: var(--text-main); 
      font-size: 0.78rem; 
      white-space: nowrap; 
    }
    .badge-chip.size-sm { padding: var(--s-2) var(--s-8); font-size: 0.7rem; }
    .badge-chip.size-sm .badge-icon { font-size: 0.85rem; }
    .badge-chip.size-sm .badge-name { font-size: 0.7rem; }

    /* Rarity Glows */
    .rarity-rare { border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 0 10px rgba(59, 130, 246, 0.1); }
    .rarity-epic { border-color: rgba(168, 85, 247, 0.4); box-shadow: 0 0 10px rgba(168, 85, 247, 0.1); }
    .rarity-legendary { border-color: rgba(234, 179, 8, 0.4); box-shadow: 0 0 15px rgba(234, 179, 8, 0.2); }
  `],
})
export class BadgeChipComponent {
  @Input({ required: true }) badge!: Badge;
  @Input() showName = false;
  @Input() size: 'sm' | 'md' = 'md';
}
