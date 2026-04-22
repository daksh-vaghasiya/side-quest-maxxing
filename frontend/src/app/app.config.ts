import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ClerkService } from './core/services/clerk.service';
import { environment } from '../environments/environment';

function initializeClerk(clerkService: ClerkService) {
  return () =>
    clerkService.initialize(environment.clerkPublishableKey).catch((err: any) => {
      console.warn('[Clerk] Initialization failed — app will continue without auth:', err);
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeClerk,
      deps: [ClerkService],
      multi: true,
    },
  ],
};
