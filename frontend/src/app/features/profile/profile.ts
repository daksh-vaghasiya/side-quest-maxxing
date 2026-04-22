import { Component, inject, signal, OnInit, computed, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../core/services/user-notification.service';
import { SubmissionService } from '../../core/services/submission.service';
import { ClerkService } from '../../core/services/clerk.service';
import { User, XpProgress } from '../../shared/models/user.model';
import { Submission } from '../../shared/models/submission.model';
import { environment } from '../../../environments/environment';

type ProfileTab = 'overview' | 'activity' | 'achievements' | 'settings';

import { UtilityRailComponent } from '../../shared/components/utility-rail/utility-rail';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, UtilityRailComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  readonly userSvc         = inject(UserService);
  private readonly submSvc = inject(SubmissionService);
  private readonly http    = inject(HttpClient);
  readonly clerk           = inject(ClerkService);

  readonly user        = signal<User | null>(null);
  readonly xpProgress  = signal<XpProgress | null>(null);
  readonly rank        = signal<number | null>(null);
  readonly submissions = signal<Submission[]>([]);
  readonly loading     = signal(true);
  readonly activeTab   = signal<ProfileTab>('overview');
  readonly submitting  = signal(false);

  // Social List Modal
  readonly socialListModalOpen = signal(false);
  readonly socialListType      = signal<'followers' | 'following'>('followers');
  readonly socialListUsers     = signal<any[]>([]);
  readonly loadingSocialList   = signal(false);

  // Follow system
  readonly isFollowing   = signal(false);
  readonly followLoading = signal(false);
  readonly followerCount = signal<number>(0);
  readonly followingCount = signal<number>(0);

  // Edit state
  readonly editMode    = signal(false);
  readonly editLoading = signal(false);
  readonly editError   = signal<string | null>(null);
  readonly editSuccess = signal(false);
  readonly editUsername = signal('');
  readonly editBio      = signal('');
  readonly editFullName = signal('');

  // Avatar
  readonly avatarLoading = signal(false);
  readonly avatarPreview = signal<string | null>(null);
  readonly avatarFile    = signal<File | null>(null);

  // Modal
  readonly showEditModal = signal(false);

  // Toasts
  private toastId = 0;
  readonly toasts = signal<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);

  // Theme
  readonly isDark = signal(true);

  // ── Dynamic Form-Based Achievements Engine ────────────────────────────────
  readonly ACHIEVEMENTS_REGISTRY = [
    // Quests
    { id: 'q1',  cat: 'Quests', title: 'First Blood',   desc: 'Complete your first quest',   icon: '⚔️', rarity: 'common',    max: 1,  getProgress: (u:any) => u?.approvedSubmissions || 0 },
    { id: 'q5',  cat: 'Quests', title: 'Quest Adept',   desc: 'Complete 5 quests',           icon: '🛡️', rarity: 'rare',      max: 5,  getProgress: (u:any) => u?.approvedSubmissions || 0 },
    { id: 'q10', cat: 'Quests', title: 'Quest Veteran', desc: 'Complete 10 quests',          icon: '🎖️', rarity: 'epic',      max: 10, getProgress: (u:any) => u?.approvedSubmissions || 0 },
    // Streaks
    { id: 's3',  cat: 'Streak', title: 'Spark',         desc: 'Maintain a 3-day streak',     icon: '✨', rarity: 'common',    max: 3,  getProgress: (u:any) => u?.longestStreak || 0 },
    { id: 's7',  cat: 'Streak', title: 'Flame',         desc: 'Maintain a 7-day streak',     icon: '🔥', rarity: 'rare',      max: 7,  getProgress: (u:any) => u?.longestStreak || 0 },
    { id: 's30', cat: 'Streak', title: 'Inferno',       desc: 'Legendary 30-day streak',     icon: '🌋', rarity: 'legendary', max: 30, getProgress: (u:any) => u?.longestStreak || 0 },
    // Reputation
    { id: 'r50', cat: 'Reputation', title: 'Respected', desc: 'Reach 50 reputation',         icon: '⭐', rarity: 'common',    max: 50,  getProgress: (u:any) => u?.reputation || 0 },
    { id: 'r100',cat: 'Reputation', title: 'Honored',   desc: 'Reach 100 reputation',        icon: '🌟', rarity: 'rare',      max: 100, getProgress: (u:any) => u?.reputation || 0 },
    { id: 'r500',cat: 'Reputation', title: 'Revered',   desc: 'Reach 500+ reputation',       icon: '💎', rarity: 'epic',      max: 500, getProgress: (u:any) => u?.reputation || 0 },
    // Community
    { id: 'c10', cat: 'Community', title: 'Voter',      desc: 'Cast 10 community votes',     icon: '🗳️', rarity: 'common',    max: 10, getProgress: (u:any) => u?.totalVotesCast || 0 },
    { id: 'c50', cat: 'Community', title: 'Judge',      desc: 'Cast 50 community votes',     icon: '⚖️', rarity: 'rare',      max: 50, getProgress: (u:any) => u?.totalVotesCast || 0 },
    // Social
    { id: 'f5',  cat: 'Social', title: 'Gathering',     desc: 'Gain 5 followers',            icon: '👥', rarity: 'common',    max: 5,  getProgress: (u:any) => u?.followers?.length || 0 },
    { id: 'f25', cat: 'Social', title: 'Cult Leader',   desc: 'Gain 25 followers',           icon: '👑', rarity: 'epic',      max: 25, getProgress: (u:any) => u?.followers?.length || 0 }
  ] as const;

  readonly achievementStatus = computed(() => {
    const u = this.user();
    if (!u) return [];

    return this.ACHIEVEMENTS_REGISTRY.map(ach => {
      const current = ach.getProgress(u);
      const progress = Math.min(current, ach.max);
      const unlocked = progress >= ach.max;
      const pct = Math.round((progress / ach.max) * 100);
      return { ...ach, current, progress, unlocked, pct };
    });
  });

  readonly achievementCategories = computed(() => {
    const statuses = this.achievementStatus();
    const categories = Array.from(new Set(statuses.map(s => s.cat)));
    return categories.map(cat => ({
      name: cat,
      achievements: statuses.filter(s => s.cat === cat)
    }));
  });

  readonly isOwnProfile = computed(() => {
    const u = this.user();
    const myProfile = this.userSvc.profile();
    if (!u || !myProfile) return false;
    return u._id === myProfile._id;
  });

  constructor() {
    // Reactive Loading: Re-trigger submission loading when viewingUser or auth identity changes.
    // Tracking this.clerk.user() directly ensures we re-fetch if identity shifts.
    effect(() => {
      const u  = this.user();
      const me = this.userSvc.profile();
      const authUser = this.clerk.user(); // Explicitly track Clerk state change
      
      if (u && me) {
        untracked(() => this.loadSubmissions(u._id));
      }
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const username = params['username'];
      if (username) {
        this.loadProfile(username);
      }
    });
  }

  loadProfile(username: string) {
    if (!username) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.userSvc.getPublicProfile(username).subscribe({
      next: (r: any) => {
        if (r.success) {
          const u = r.user;
          this.user.set(u);
          this.xpProgress.set(r.xpProgress);
          this.rank.set(r.rank);
          
          this.followerCount.set(u?.followers?.length ?? 0);
          this.followingCount.set(u?.following?.length ?? 0);
          this.checkFollowStatus(u);
          
          if (u) {
            this.editUsername.set(u.username ?? '');
            this.editBio.set(u.bio ?? '');
            this.editFullName.set(u.fullName ?? '');
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  checkFollowStatus(profileUser: any) {
    const myProfile = this.userSvc.profile();
    if (!myProfile || !profileUser.followers) return;
    const following = profileUser.followers.some(
      (id: any) => id.toString() === (myProfile as any)._id?.toString()
    );
    this.isFollowing.set(following);
  }

  onToggleFollow(userId: string) {
    if (!this.clerk.isSignedIn()) return this.clerk.redirectToSignIn();
    this.userSvc.toggleFollow(userId).subscribe({
      next: (res) => {
        if (res.success) {
          // Update the local user signal immediately for feedback
          this.user.update((u: any) => {
            if (!u) return u;
            return {
              ...u,
              followers: res.following
                ? [...(u.followers || []), this.userSvc.profile()?._id]
                : (u.followers || []).filter((id: string) => id !== this.userSvc.profile()?._id)
            };
          });
          
          // If viewing own profile or the target is in a list, we might need more sync.
          // But usually, refreshing the counts is enough.
        }
      }
    });
  }

  openFollowers() {
    const u = this.user();
    if (!u) return;
    this.socialListType.set('followers');
    this.socialListModalOpen.set(true);
    this.fetchSocialList(u._id, 'followers');
  }

  openFollowing() {
    const u = this.user();
    if (!u) return;
    this.socialListType.set('following');
    this.socialListModalOpen.set(true);
    this.fetchSocialList(u._id, 'following');
  }

  private fetchSocialList(userId: string, type: 'followers' | 'following') {
    this.loadingSocialList.set(true);
    const obs = type === 'followers' 
      ? this.userSvc.getFollowers(userId) 
      : this.userSvc.getFollowing(userId);
      
    obs.subscribe({
      next: (res) => {
        this.socialListUsers.set(res.users || []);
        this.loadingSocialList.set(false);
      },
      error: () => this.loadingSocialList.set(false)
    });
  }

  closeSocialModal() {
    this.socialListModalOpen.set(false);
    this.socialListUsers.set([]);
  }

  isFollowingInList(userId: string): boolean {
    const me = this.userSvc.profile();
    if (!me) return false;
    return me.following?.includes(userId as any) ?? false;
  }

  toggleFollowInList(targetUser: any) {
    if (!this.clerk.isSignedIn()) return this.clerk.redirectToSignIn();
    this.userSvc.toggleFollow(targetUser._id).subscribe({
      next: (res) => {
        if (res.success) {
          // Re-fetch 'me' to update the following list globally
          this.userSvc.getMe().subscribe();
        }
      }
    });
  }

  toggleFollow() {
    if (!this.clerk.isSignedIn()) { this.router.navigate(['/sign-in']); return; }
    if (this.followLoading()) return;
    const targetId = (this.user() as any)?._id;
    if (!targetId) return;
    
    this.followLoading.set(true);
    this.userSvc.toggleFollow(targetId).subscribe({
      next: (res) => {
        if (res.success) {
          this.isFollowing.set(res.following);
          this.followerCount.set(res.followerCount);
          this.showToast(
            res.following ? '✅ Now following ' + this.user()?.username : '👋 Unfollowed ' + this.user()?.username,
            'success'
          );
        }
        this.followLoading.set(false);
      },
      error: (e) => {
        this.followLoading.set(false);
        this.showToast('⚠️ Could not update follow status', 'error');
      },
    });
  }

  loadSubmissions(userId: string) {
    if (this.isOwnProfile()) {
      this.submSvc.getMySubmissions().subscribe({
        next: (r) => this.submissions.set(r.data ?? []),
      });
    } else {
      this.submSvc.listSubmissions({ userId, status: 'approved', limit: 20 } as any).subscribe({
        next: (r) => this.submissions.set(r.data ?? []),
      });
    }
  }

  setTab(tab: ProfileTab) { this.activeTab.set(tab); }

  startEdit() {
    this.editUsername.set(this.user()?.username ?? '');
    this.editFullName.set((this.user() as any)?.fullName ?? '');
    this.editBio.set(this.user()?.bio ?? '');
    this.editMode.set(true);
    this.editError.set(null);
    this.editSuccess.set(false);
    this.avatarFile.set(null);
  }

  cancelEdit() { this.editMode.set(false); this.editError.set(null); this.avatarFile.set(null); }

  openEditModal() {
    this.editUsername.set(this.user()?.username ?? '');
    this.editFullName.set(this.user()?.fullName ?? '');
    this.editBio.set(this.user()?.bio ?? '');
    this.editError.set(null);
    this.avatarFile.set(null);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editError.set(null);
    this.avatarFile.set(null);
  }

  saveProfile() {
    if (!this.editUsername().trim()) { this.editError.set('Username cannot be empty'); return; }
    if (this.editUsername().trim().length < 3) { this.editError.set('Username must be at least 3 characters'); return; }
    
    this.editLoading.set(true);
    this.editError.set(null);
    
    const fd = new FormData();
    fd.append('username', this.editUsername().trim());
    fd.append('bio', this.editBio().trim());
    if (this.editFullName().trim()) {
      fd.append('fullName', this.editFullName().trim());
    }
    const file = this.avatarFile();
    if (file) {
      fd.append('avatar', file);
    }

    this.userSvc.updateFullProfile(fd).subscribe({
      next: (r: any) => {
        this.editLoading.set(false);
        this.editMode.set(false);
        this.showEditModal.set(false);
        this.editSuccess.set(true);
        if (r.user) {
           // Fully update viewed user (includes XP, Level, Stats)
           this.user.set(r.user);
           // Better yet: Trigger a full profile reload to get the rank and xpProgress from public profile endpoint
           this.loadProfile(r.user.username);
        }
        this.showToast('✅ Profile updated securely via Clerk!', 'success');
        this.avatarFile.set(null);
        setTimeout(() => this.editSuccess.set(false), 3000);
      },
      error: (e) => {
        this.editLoading.set(false);
        const msg = e?.error?.message || e?.error?.error || 'Update failed. Please try again.';
        this.editError.set(msg);
        this.showToast('⚠️ ' + msg, 'error');
      },
    });
  }

  onAvatarChange(event: Event, instantUpload = false) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.showToast('⚠️ Image must be under 5MB', 'error'); return; }
    
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview.set(reader.result as string);
    reader.readAsDataURL(file);
    
    // Hold the file
    this.avatarFile.set(file);

    if (instantUpload) {
       this.saveProfile();
    }
  }

  signOut() {
    this.clerk.signOut().then(() => { this.userSvc.clearProfile(); this.router.navigate(['/feed']); });
  }

  toggleTheme() {
    this.isDark.update(v => !v);
    document.documentElement.setAttribute('data-theme', this.isDark() ? 'dark' : 'light');
  }

  showToast(msg: string, type: 'success' | 'error') {
    const id = ++this.toastId;
    this.toasts.update(t => [...t, { id, msg, type }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 3500);
  }

  dismissToast(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  // ── Computed helpers ──────────────────────────────────────────────────────
  get levelIcon(): string {
    const map: Record<string, string> = { Beginner: '🌱', Intermediate: '⚡', Pro: '💎', Legend: '👑' };
    return map[this.user()?.level ?? 'Beginner'] ?? '🌱';
  }

  get levelGlow(): string {
    const map: Record<string, string> = {
      Beginner: 'rgba(16,185,129,0.4)', Intermediate: 'rgba(245,158,11,0.4)',
      Pro: 'rgba(168,85,247,0.4)', Legend: 'rgba(6,182,212,0.4)'
    };
    return map[this.user()?.level ?? 'Beginner'] ?? 'rgba(16,185,129,0.4)';
  }

  get approvalRate(): number {
    const u = this.user();
    if (!u?.totalSubmissions) return 0;
    return Math.round((u.approvedSubmissions / u.totalSubmissions) * 100);
  }

  readonly recentActivity      = computed(() => this.submissions().slice(0, 5));
  readonly gallerySubmissions   = computed(() => this.submissions().filter(s => s.status === 'approved'));

  questTitle(sub: Submission): string {
    const q = sub.questId as any;
    return typeof q === 'object' && q?.title ? q.title : 'Quest';
  }

  subDate(sub: Submission): string {
    return this.formatDate((sub as any).createdAt);
  }

  hasDate(sub: Submission): boolean {
    return !!(sub as any).createdAt;
  }

  statusLabel(s: string) { return ({ approved: '✅ Legit', rejected: '❌ Not Legit', pending: '🗳️ Voting' } as any)[s] ?? s; }
  statusClass(s: string) { return ({ approved: 'status-approved', rejected: 'status-rejected', pending: 'status-pending' } as any)[s] ?? ''; }

  rarityClass(r: string) { return ({ common: 'rarity-common', rare: 'rarity-rare', epic: 'rarity-epic', legendary: 'rarity-legendary' } as any)[r] ?? 'rarity-common'; }
  rarityLabel(r: string) { return ({ common: '○ Common', rare: '◈ Rare', epic: '◆ Epic', legendary: '★ Legendary' } as any)[r] ?? r; }

  levelProgress(lvl: string): number {
    return ({ Beginner: 0, Intermediate: 25, Pro: 60, Legend: 90 } as any)[lvl] ?? 0;
  }



  // Timestamp formatter (no pipe needed)
  formatDate(dateStr: any): string {
    if (!dateStr) return '';
    try {
      const date  = new Date(dateStr);
      const now   = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7)  return diffDays + ' days ago';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  }
}
