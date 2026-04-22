import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClerkService } from '../../core/services/clerk.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-layout">
      <div class="auth-left">
        <a routerLink="/feed" class="back-link">← Back to Feed</a>
        <div class="auth-brand">
          <span class="brand-icon">⚡</span>
          <h1 class="brand-name">SideQuest<span class="brand-accent">Maxxing</span></h1>
          <p class="brand-tagline">Level Up IRL. One Quest at a Time.</p>
        </div>
        <div class="auth-stats">
          <div class="stat-pair"><span class="stat-n">15K+</span><span class="stat-l">Questers</span></div>
          <div class="stat-pair"><span class="stat-n">200K+</span><span class="stat-l">XP Earned</span></div>
          <div class="stat-pair"><span class="stat-n">50+</span><span class="stat-l">Quests</span></div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-card">
          <div class="auth-card-icon">🔐</div>
          <h2 class="auth-card-title">Sign In</h2>
          <p class="auth-card-sub">Click below to sign in securely via Clerk</p>
          <button class="neon-btn auth-cta" (click)="signIn()" [disabled]="!clerk.isLoaded()">
            @if (!clerk.isLoaded()) {
              <span class="spin">⚡</span> Loading...
            } @else {
              ⚡ Continue to Sign In
            }
          </button>
          <p class="auth-switch">Don't have an account? <a routerLink="/sign-up" class="auth-link">Join Now →</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-layout { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
    .auth-left {
      background: linear-gradient(135deg, #0E0E1A 0%, #130D2B 100%);
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex; flex-direction: column; justify-content: center;
      padding: 4rem 3rem; position: relative;
    }
    .back-link { position: absolute; top: 2rem; left: 2rem; color: #94A3B8; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
    .back-link:hover { color: #A855F7; }
    .auth-brand { margin-bottom: 3rem; }
    .brand-icon { font-size: 3rem; display: block; margin-bottom: 1rem; filter: drop-shadow(0 0 16px rgba(124,58,237,0.8)); animation: float 4s ease-in-out infinite; }
    .brand-name { font-family: 'Rajdhani', sans-serif; font-size: 2.2rem; font-weight: 700; color: #F8FAFC; margin: 0 0 0.5rem; }
    .brand-accent { color: #A855F7; }
    .brand-tagline { color: #64748B; font-size: 1rem; margin: 0; }
    .auth-stats { display: flex; gap: 2rem; }
    .stat-pair { display: flex; flex-direction: column; }
    .stat-n { font-family: 'Rajdhani', sans-serif; font-size: 1.8rem; font-weight: 700; color: #A855F7; }
    .stat-l { font-size: 0.8rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; }
    .auth-right { display: flex; align-items: center; justify-content: center; padding: 2rem; background: rgba(0,0,0,0.2); }
    .auth-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      width: 100%; max-width: 420px;
      text-align: center;
      backdrop-filter: blur(20px);
    }
    .auth-card-icon { font-size: 3.5rem; margin-bottom: 1.5rem; display: block; }
    .auth-card-title { font-family: 'Rajdhani', sans-serif; font-size: 2rem; font-weight: 700; color: #F8FAFC; margin: 0 0 0.75rem; }
    .auth-card-sub { color: #64748B; font-size: 0.95rem; margin: 0 0 2rem; }
    .auth-cta { width: 100%; padding: 1rem; font-size: 1rem; font-weight: 700; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .auth-cta:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-switch { margin-top: 1.5rem; color: #64748B; font-size: 0.9rem; }
    .auth-link { color: #A855F7; text-decoration: none; }
    .auth-link:hover { text-decoration: underline; }
    .spin { display: inline-block; animation: spin 1s linear infinite; }
    @media (max-width: 768px) { .auth-layout { grid-template-columns: 1fr; } .auth-left { display: none; } }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SignInPage implements OnInit {
  readonly clerk = inject(ClerkService);

  ngOnInit() {
    // If already signed in, redirect to dashboard
    if (this.clerk.isSignedIn()) {
      window.location.href = '/auth/sync';
    }
  }

  signIn() {
    this.clerk.redirectToSignIn();
  }
}
