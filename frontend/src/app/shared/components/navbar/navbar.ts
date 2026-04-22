import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ClerkService } from '../../../core/services/clerk.service';
import { UserService, NotificationService } from '../../../core/services/user-notification.service';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  readonly clerk = inject(ClerkService);
  readonly userSvc = inject(UserService);
  readonly notifSvc = inject(NotificationService);
  readonly chatSvc = inject(ChatService);
  readonly router = inject(Router);

  readonly mobileOpen = signal(false);
  readonly isCollapsed = signal(false);
  readonly notifOpen  = signal(false);
  readonly notifications = signal<any[]>([]);
  readonly loadingNotifs = signal(false);

  constructor() {
    effect(() => {
      if (this.clerk.isSignedIn()) {
        this.userSvc.getMe().subscribe();
        this.notifSvc.getUnreadCount().subscribe();
      }
    });

    // Update global CSS variable for layout shifting
    effect(() => {
      const width = this.isCollapsed() ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)';
      document.documentElement.style.setProperty('--sidebar-width', width);
    });
  }

  toggleMobile() { this.mobileOpen.update(v => !v); }
  closeMobile()  { this.mobileOpen.set(false); }
  toggleSidebar() { this.isCollapsed.update(v => !v); }

  signIn()  { this.clerk.redirectToSignIn(); }
  signUp()  { this.clerk.redirectToSignUp(); }
  signOut() { this.clerk.signOut().then(() => { this.userSvc.clearProfile(); this.router.navigate(['/feed']); }); }

  loadNotifications() {
    if (!this.clerk.isSignedIn()) return;
    this.loadingNotifs.set(true);
    this.notifSvc.getNotifications(1).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.loadingNotifs.set(false);
      },
      error: () => this.loadingNotifs.set(false)
    });
  }

  onNotificationClick(notif: any) {
    if (!notif.read) {
      this.notifSvc.markOneRead(notif._id).subscribe(() => {
        this.notifSvc.getUnreadCount().subscribe();
      });
    }
    
    this.notifOpen.set(false);
    
    // Redirect logic based on metadata
    const meta = notif.metadata;
    if (meta?.submissionId) {
      this.router.navigate(['/submissions', meta.submissionId]);
    } else if (meta?.questId) {
      this.router.navigate(['/quests']);
    } else if (meta?.fromUserId) {
      // Find user by ID? Backend doesn't return username here usually.
      // For now, go to dashboard or people search.
      this.router.navigate(['/search']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  markAllAsRead() {
    this.notifSvc.markAllRead().subscribe(() => {
      this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    });
  }

  toggleNotif() { 
    this.notifOpen.update(v => !v); 
    if (this.notifOpen()) {
      this.loadNotifications();
    }
  }

  readonly navLinks = [
    { path: '/feed',        label: 'Feed',        icon: '🌊' },
    { path: '/quests',      label: 'Quests',      icon: '⚔️' },
    { path: '/leaderboard', label: 'Leaders',     icon: '🏆' },
    { path: '/chat',        label: 'Chat',        icon: '💬' },
    { path: '/community',   label: 'Community',   icon: '🌐' },
    { path: '/search',      label: 'People',      icon: '🔍' },
    { path: '/dashboard',   label: 'Dashboard',   icon: '🎮' },
  ];
}
