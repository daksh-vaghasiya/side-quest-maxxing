import { Component, Input, OnChanges } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-xp-bar',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="xp-bar-wrap">
      <div class="xp-labels">
        <span class="xp-current">{{ currentXp | number }} XP</span>
        @if (nextLevel) {
          <span class="xp-next">{{ xpToNext | number }} to {{ nextLevel }}</span>
        } @else {
          <span class="xp-next xp-max">MAX</span>
        }
      </div>
      <div class="xp-track">
        <div class="xp-fill" [style.--xp-pct]="pct + '%'" [style.width]="pct + '%'"></div>
        <div class="xp-glow" [style.width]="pct + '%'"></div>
      </div>
      <div class="xp-pct-label">{{ pct }}%</div>
    </div>
  `,
  styles: [`
    .xp-bar-wrap { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; }
    .xp-labels { display: flex; justify-content: space-between; align-items: center; }
    .xp-current { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 0.9rem; color: #A855F7; }
    .xp-next    { font-size: 0.75rem; color: #64748B; }
    .xp-max     { color: #F59E0B; font-weight: 700; }
    .xp-track {
      position: relative;
      height: 8px;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      overflow: hidden;
    }
    .xp-fill {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      background: linear-gradient(90deg, #7C3AED, #A855F7, #06B6D4);
      border-radius: 999px;
      animation: xpFill 1.2s cubic-bezier(0.22,1,0.36,1) forwards;
      --xp-pct: 0%;
    }
    .xp-glow {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      background: linear-gradient(90deg, #7C3AED, #A855F7);
      border-radius: 999px;
      filter: blur(6px);
      opacity: 0.5;
      transition: width 1.2s ease;
    }
    .xp-pct-label { font-size: 0.7rem; color: #64748B; text-align: right; }
    @keyframes xpFill { from { width: 0 } to { width: var(--xp-pct) } }
  `],
})
export class XpBarComponent implements OnChanges {
  @Input({ required: true }) currentXp!: number;
  @Input({ required: true }) pct!: number;
  @Input() nextLevel: string | null = null;
  @Input() xpToNext = 0;

  ngOnChanges() {}
}
