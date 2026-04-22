import { Component, inject, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ClerkService } from '../../core/services/clerk.service';
import { DatePipe, DecimalPipe } from '@angular/common';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DecimalPipe, DatePipe, UtilityRailComponent],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminPage implements OnInit {
  private readonly api   = inject(ApiService);
  readonly clerk = inject(ClerkService);

  readonly stats       = signal<any>(null);
  readonly submissions = signal<any[]>([]);
  readonly users       = signal<any[]>([]);
  readonly auditLogs   = signal<any[]>([]);
  readonly cQuests     = signal<any[]>([]);
  readonly loading     = signal(true);
  readonly activeTab   = signal<'dashboard' | 'submissions' | 'users' | 'quests' | 'logs'>('dashboard');
  readonly actionMsg   = signal('');

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.loading.set(true);
    this.api.get('/admin/dashboard').subscribe({
      next: (r: any) => { this.stats.set(r.stats); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadSubmissions(status = '') {
    const params: any = { limit: 20 };
    if (status) params.status = status;
    this.api.get('/admin/submissions', params).subscribe({ next: (r: any) => this.submissions.set(r.data ?? []) });
  }

  loadUsers() {
    this.api.get('/admin/users', { limit: 30 }).subscribe({ next: (r: any) => this.users.set(r.data ?? []) });
  }

  loadCommunityQuests() {
    this.api.get('/admin/community-quests', { limit: 20 }).subscribe({ next: (r: any) => this.cQuests.set(r.data ?? []) });
  }

  loadAuditLogs() {
    this.api.get('/admin/audit-logs', { limit: 30 }).subscribe({ next: (r: any) => this.auditLogs.set(r.data ?? []) });
  }

  setTab(tab: any) {
    this.activeTab.set(tab);
    if (tab === 'submissions') this.loadSubmissions();
    if (tab === 'users')       this.loadUsers();
    if (tab === 'quests')      this.loadCommunityQuests();
    if (tab === 'logs')        this.loadAuditLogs();
    if (tab === 'dashboard')   this.loadDashboard();
  }

  moderate(id: string, action: 'approve' | 'reject', reason = '') {
    this.api.patch(`/admin/submissions/${id}/moderate`, { action, reason }).subscribe({
      next: () => {
        this.actionMsg.set(`✅ Submission ${action}d`);
        this.submissions.update(list => list.filter(s => s._id !== id));
        setTimeout(() => this.actionMsg.set(''), 3000);
      },
    });
  }

  banUser(id: string, reason = 'Policy violation') {
    this.api.patch(`/admin/users/${id}/ban`, { reason, durationDays: 7 }).subscribe({
      next: () => { this.actionMsg.set('🚫 User banned for 7 days'); this.loadUsers(); setTimeout(() => this.actionMsg.set(''), 3000); },
    });
  }

  warnUser(id: string) {
    this.api.patch(`/admin/users/${id}/warn`, { reason: 'Community guideline violation' }).subscribe({
      next: (r: any) => { this.actionMsg.set(`⚠️ User warned (${r.warnings} total)`); this.loadUsers(); setTimeout(() => this.actionMsg.set(''), 3000); },
    });
  }

  approveCQ(id: string) {
    this.api.patch(`/admin/community-quests/${id}`, { action: 'approve' }).subscribe({
      next: () => { this.actionMsg.set('✅ Community quest approved and promoted!'); this.loadCommunityQuests(); setTimeout(() => this.actionMsg.set(''), 3000); },
    });
  }

  rejectCQ(id: string) {
    this.api.patch(`/admin/community-quests/${id}`, { action: 'reject', reason: 'Does not meet guidelines' }).subscribe({
      next: () => { this.actionMsg.set('❌ Community quest rejected'); this.loadCommunityQuests(); setTimeout(() => this.actionMsg.set(''), 3000); },
    });
  }
}
