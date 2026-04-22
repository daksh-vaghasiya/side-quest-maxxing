import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { ClerkService } from '../services/clerk.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Pass through non-API requests without touching them
  if (!req.url.includes('/api/')) return next(req);

  const clerk = inject(ClerkService);

  const tokenPromise = (async (): Promise<string | null> => {
    // Step 1: Wait for Clerk SDK to finish loading (max 5 s)
    // This is different from waiting for a SESSION — the user may simply not be signed in.
    await clerk.waitForLoaded();

    // Step 2: Check if a session exists right now (synchronous, no waiting)
    const hasSession = clerk.hasActiveSession;

    if (!hasSession) {
      // No session = user is not signed in. Allow the request to go through
      // without a token so public endpoints still work.
      console.log(`[Auth Interceptor] ℹ️ No session — sending unauthenticated: ${req.url}`);
      return null;
    }

    // Step 3: Session exists — get the JWT
    const token = await clerk.getToken();
    if (token) {
      console.log(`[Auth Interceptor] ✅ Token attached: ${req.url}`);
    } else {
      console.warn(`[Auth Interceptor] ⚠️ Session exists but token was null: ${req.url}`);
    }
    return token;
  })();

  return from(tokenPromise).pipe(
    switchMap(token => {
      if (!token) {
        // No token: send the request as-is (public/unauthenticated)
        return next(req);
      }
      // Attach the Bearer token
      return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      }));
    })
  );
};

