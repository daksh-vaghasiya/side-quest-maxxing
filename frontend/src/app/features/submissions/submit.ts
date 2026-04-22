import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SubmissionService } from '../../core/services/submission.service';
import { QuestService } from '../../core/services/quest.service';
import { Quest } from '../../shared/models/quest.model';

@Component({
  selector: 'app-submit',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './submit.html',
  styleUrl: './submit.css',
})
export class SubmitPage implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly submSvc = inject(SubmissionService);
  private readonly questSvc = inject(QuestService);

  readonly quest       = signal<Quest | null>(null);
  readonly description = signal('');
  readonly files       = signal<File[]>([]);
  readonly previews    = signal<string[]>([]);
  readonly submitting  = signal(false);
  readonly error       = signal('');
  readonly success     = signal(false);

  ngOnInit() {
    const questId = this.route.snapshot.params['questId'];
    this.questSvc.getQuest(questId).subscribe({
      next: (r: any) => this.quest.set(r.quest),
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    if (selected.length === 0) return;

    const valid = selected.filter(f => f.size < 50 * 1024 * 1024); // 50MB limit
    this.files.set(valid.slice(0, 5)); // max 5 files

    const urls = valid.slice(0, 5).map(f => URL.createObjectURL(f));
    this.previews.set(urls);
  }

  removeFile(i: number) {
    this.files.update(f => f.filter((_, idx) => idx !== i));
    this.previews.update(p => p.filter((_, idx) => idx !== i));
  }

  isVideo(file: File) { return file.type.startsWith('video/'); }

  submit() {
    if (this.files().length === 0) { this.error.set('Please upload at least one photo or video as proof.'); return; }
    const quest = this.quest();
    if (!quest) return;

    this.submitting.set(true);
    this.error.set('');

    const fd = new FormData();
    fd.append('questId', quest._id);
    fd.append('description', this.description());
    this.files().forEach(f => fd.append('media', f));

    this.submSvc.createSubmission(fd).subscribe({
      next: (r: any) => {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/submissions/' + r.submission._id]), 2000);
      },
      error: (e) => {
        this.error.set(e?.error?.message || 'Submission failed. Please try again.');
        this.submitting.set(false);
      },
    });
  }
}
