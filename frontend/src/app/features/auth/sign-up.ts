import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClerkService } from '../../core/services/clerk.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-layout">
      <div class="auth-left">
        <a routerLink="/feed" class="back-link">← Back to Feed</a>
        <div class="auth-brand">
          <span class="brand-icon">🏆</span>
          <h1 class="brand-name">Join the <span class="brand-accent">Maxxers</span></h1>
          <p class="brand-tagline">Create your account. Start your first quest today.</p>
        </div>
        <ul class="perks">
          <li>⚡ Earn XP for real-world challenges</li>
          <li>🏅 Unlock badges and climb the leaderboard</li>
          <li>🗳️ Vote and validate community submissions</li>
          <li>🌐 Submit your own quest ideas</li>
        </ul>
      </div>
      <div class="auth-right">
        <div class="auth-card">
          <div class="auth-card-icon">🚀</div>
          <h2 class="auth-card-title">Create Account</h2>
          <p class="auth-card-sub">Join thousands of questers levelling up IRL</p>
          <button class="neon-btn auth-cta" (click)="signUp()" [disabled]="!clerk.isLoaded()">
            @if (!clerk.isLoaded()) {
              <span class="spin">⚡</span> Loading...
            } @else {
              🚀 Create My Account
            }
          </button>
          <div class="divider"><span>Already a Maxxer?</span></div>
          <button class="neon-btn-outline auth-cta-secondary" (click)="signIn()">
            Sign In Instead →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-layout { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
    .auth-left {
      background: linear-gradient(135deg, #0E0E1A 0%, #0D1B2B 100%);
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex; flex-direction: column; justify-content: center;
      padding: 4rem 3rem; position: relative;
    }
    .back-link { position: absolute; top: 2rem; left: 2rem; color: #94A3B8; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
    .back-link:hover { color: #06B6D4; }
    .auth-brand { margin-bottom: 2.5rem; }
    .brand-icon { font-size: 3rem; display: block; margin-bottom: 1rem; animation: float 4s ease-in-out infinite; }
    .brand-name { font-family: 'Rajdhani', sans-serif; font-size: 2rem; font-weight: 700; color: #F8FAFC; margin: 0 0 0.5rem; }
    .brand-accent { color: #06B6D4; }
    .brand-tagline { color: #64748B; font-size: 0.95rem; margin: 0; }
    .perks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .perks li { color: #94A3B8; font-size: 0.92rem; padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
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
    .auth-cta-secondary { width: 100%; padding: 0.85rem; font-size: 0.95rem; border-radius: 12px; cursor: pointer; }
    .divider { display: flex; align-items: center; gap: 1rem; margin: 1.5rem 0; color: #475569; font-size: 0.85rem; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
    .spin { display: inline-block; animation: spin 1s linear infinite; }
    @media (max-width: 768px) { .auth-layout { grid-template-columns: 1fr; } .auth-left { display: none; } }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SignUpPage implements OnInit {
  readonly clerk = inject(ClerkService);

  ngOnInit() {
    if (this.clerk.isSignedIn()) {
      window.location.href = '/auth/sync';
    }
  }

  signUp() { this.clerk.redirectToSignUp(); }
  signIn() { this.clerk.redirectToSignIn(); }
}
