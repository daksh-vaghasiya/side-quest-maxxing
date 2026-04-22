import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ClerkService } from '../../core/services/clerk.service';
import { UserService } from '../../core/services/user-notification.service';

@Component({
  selector: 'app-sync',
  standalone: true,
  template: `
    <div class="sync-container">
      <div class="sync-card glass-card-static">
        @if (error()) {
          <div class="sync-icon">❌</div>
          <h2 class="sync-title">Sync Failed</h2>
          <p class="sync-msg">{{ error() }}</p>
          <button class="neon-btn" (click)="retry()">Retry</button>
        } @else {
          <div class="sync-icon spin">⚡</div>
          <h2 class="sync-title">Entering the Realm...</h2>
          <p class="sync-msg">Setting up your profile</p>
          <div class="sync-bar"><div class="sync-bar-fill"></div></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sync-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
    .sync-card { padding: 3rem; text-align: center; max-width: 400px; width: 100%; border-radius: 20px; }
    .sync-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .spin { animation: spin 1.5s linear infinite; display: inline-block; filter: drop-shadow(0 0 12px rgba(124,58,237,0.8)); }
    .sync-title { font-family: 'Rajdhani', sans-serif; font-size: 1.6rem; font-weight: 700; color: #F8FAFC; margin: 0 0 0.5rem; }
    .sync-msg   { color: #94A3B8; font-size: 0.9rem; margin: 0 0 1.5rem; }
    .sync-bar   { height: 4px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
    .sync-bar-fill { height: 100%; background: linear-gradient(90deg, #7C3AED, #A855F7, #06B6D4); border-radius: 999px; animation: loading 1.8s ease-in-out infinite; }
    @keyframes loading { 0%{width:0;margin-left:0} 50%{width:70%;margin-left:0} 100%{width:0;margin-left:100%} }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SyncPage implements OnInit {
  private readonly clerk  = inject(ClerkService);
  private readonly user   = inject(UserService);
  private readonly router = inject(Router);

  private hasRetried = false;

  readonly error = signal<string | null>(null);

  ngOnInit() { this.sync(); }

  async sync() {
    this.error.set(null);
    
    // Ensure Clerk is initialized
    await this.clerk.waitForLoaded();

    // The user just signed in, so we should wait briefly for the session to propagate
    await this.clerk.waitForSession(3000);

    const cu = this.clerk.clerkUser;
    if (!cu) {
      console.warn('[Sync] No Clerk user found after wait. Redirecting to sign in.');
      this.clerk.redirectToSignIn();
      return;
    }

    let rawUsername = cu.username ?? cu.firstName ?? cu.lastName ?? `user_${Date.now()}`;
    // Sanitize username: keep only letters, numbers, and underscores, convert to lowercase
    let username = rawUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    // Enforce 3-30 char limit
    if (username.length < 3) username = `usr_${Date.now()}`.substring(0, 15);
    if (username.length > 30) username = username.substring(0, 30);

    const email    = cu.emailAddresses?.[0]?.emailAddress ?? `user_${Date.now()}@placeholder.com`;
    const avatar = (cu.imageUrl && cu.imageUrl.startsWith('http'))
      ? cu.imageUrl
      : undefined;

    this.user.syncUser(username, email, avatar).subscribe({
      next: (res) => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('[Sync] Attempt failed:', err);
        
        // Automatic retry logic (once)
        if (!this.hasRetried) {
          console.log('[Sync] Retrying once...');
          this.hasRetried = true;
          setTimeout(() => this.sync(), 1500);
          return;
        }

        const backendMessage = err?.error?.message || err?.message || 'Unknown network error';
        this.error.set(backendMessage);
      },
    });
  }

  retry() { 
    this.hasRetried = false; 
    this.sync(); 
  }
}
