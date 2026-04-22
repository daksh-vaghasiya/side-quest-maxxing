import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClerkService } from '../services/clerk.service';

export const authGuard = (): boolean => {
  const clerk  = inject(ClerkService);
  const router = inject(Router);

  if (clerk.isSignedIn()) return true;

  // Redirect to Clerk hosted sign-in, then back to the app
  clerk.redirectToSignIn();
  return false;
};
