import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClerkService {
  private clerk: any = null;

  private readonly _isLoaded   = signal(false);
  private readonly _user       = signal<any>(null);
  private readonly _isSignedIn = signal(false);

  readonly isLoaded   = this._isLoaded.asReadonly();
  readonly user       = this._user.asReadonly();
  readonly isSignedIn = this._isSignedIn.asReadonly();

  readonly displayName = computed(() => {
    const u = this._user();
    if (!u) return '';
    return u.username ?? u.firstName ?? u.emailAddresses?.[0]?.emailAddress ?? 'User';
  });

  readonly avatarUrl = computed(() => {
    const u = this._user();
    return u?.imageUrl ?? 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  });

  async initialize(publishableKey: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!publishableKey || publishableKey.includes('REPLACE')) {
      console.warn('[Clerk] ⚠️  publishableKey not configured — auth disabled');
      this._isLoaded.set(true);
      return;
    }

    try {
      const clerkModule: any = await import('@clerk/clerk-js');
      const ClerkClass = clerkModule.default ?? clerkModule.Clerk ?? clerkModule;
      this.clerk = new ClerkClass(publishableKey);
      (window as any).Clerk = this.clerk; // Attach globally for direct access

      await this.clerk.load({
        appearance: {
          variables: {
            colorPrimary:         '#7C3AED',
            colorBackground:      '#0E0E1A',
            colorText:            '#F8FAFC',
            colorTextSecondary:   '#94A3B8',
            colorInputBackground: 'rgba(255,255,255,0.06)',
            colorInputText:       '#F8FAFC',
            fontFamily:           'Inter, sans-serif',
            borderRadius:         '12px',
          },
        },
      });
      this._isLoaded.set(true);
      this.syncState();
      this.clerk.addListener(() => this.syncState());
    } catch (err) {
      console.warn('[Clerk] Load failed:', err);
      this._isLoaded.set(true);
    }
  }

  private syncState(): void {
    this._user.set(this.clerk?.user ?? null);
    this._isSignedIn.set(!!this.clerk?.user);
  }

  async getToken(): Promise<string | null> {
    try {
      // Wait for Clerk to finish loading (not for session — caller must check that)
      await this.waitForLoaded();

      const globalClerk = (window as any).Clerk;
      if (globalClerk?.session) {
        const token = await globalClerk.session.getToken();
        console.log('[ClerkService] 🔑 Token obtained from window.Clerk.session:', token ? '✅' : '❌');
        return token;
      }

      if (this.clerk?.session) {
        const token = await this.clerk.session.getToken();
        console.log('[ClerkService] 🔑 Token obtained from clerk.session:', token ? '✅' : '❌');
        return token;
      }

      console.warn('[ClerkService] ⚠️ getToken: no active session found.');
      return null;
    } catch (err) {
      console.error('[ClerkService] ❌ Exception in getToken():', err);
      return null;
    }
  }

  /**
   * waitForLoaded — Blocks until Clerk is successfully loaded and initialized.
   * Prevents premature API calls during the initial boot sequence.
   */
  async waitForLoaded(): Promise<void> {
    if (this._isLoaded()) return;

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (this._isLoaded()) {
          clearInterval(timer);
          resolve();
        }
      }, 50);

      // Safety timeout after 10 seconds
      setTimeout(() => { clearInterval(timer); resolve(); }, 10000);
    });
  }

  /**
   * waitForSession — Blocks until window.Clerk.session (or clerk.session) is truthy,
   * meaning a user is actually signed in and their session is available.
   * This is distinct from waitForLoaded, which only confirms Clerk has booted.
   */
  async waitForSession(maxMs = 3000): Promise<void> {
    const step = 50;
    let elapsed = 0;
    while (elapsed < maxMs) {
      const globalClerk = (window as any).Clerk;
      if ((globalClerk?.session) || (this.clerk?.session)) {
        console.log('[ClerkService] ✅ Session is ready');
        return;
      }
      await new Promise(r => setTimeout(r, step));
      elapsed += step;
    }
    // Timeout — no session found (user may not be signed in)
    console.warn('[ClerkService] ⚠️ waitForSession: no session after', maxMs, 'ms (user may not be signed in)');
  }

  /** Redirect to Clerk's hosted Sign In page (most reliable in v6) */
  redirectToSignIn(): void {
    const afterUrl = window.location.origin + '/auth/sync';
    this.clerk?.redirectToSignIn({ redirectUrl: afterUrl });
  }

  /** Alias kept for backwards compatibility */
  openSignIn(redirectUrl?: string): void {
    this.redirectToSignIn();
  }

  /** Redirect to Clerk's hosted Sign Up page (most reliable in v6) */
  redirectToSignUp(): void {
    const afterUrl = window.location.origin + '/auth/sync';
    this.clerk?.redirectToSignUp({ redirectUrl: afterUrl });
  }

  /** Alias kept for backwards compatibility */
  openSignUp(redirectUrl?: string): void {
    this.redirectToSignUp();
  }

  async signOut(): Promise<void> {
    await this.clerk?.signOut();
    this.syncState();
  }

  get clerkUserId(): string | undefined {
    return this.clerk?.user?.id;
  }

  get clerkUser(): any {
    return this.clerk?.user ?? null;
  }

  get isLoaded$(): boolean {
    return this._isLoaded();
  }

  /**
   * Returns true if Clerk is loaded AND an active session exists.
   * Safe to call at any time — does not wait or block.
   */
  get hasActiveSession(): boolean {
    const globalClerk = (window as any).Clerk;
    return !!(globalClerk?.session || this.clerk?.session);
  }
}
