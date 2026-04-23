import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/feed', pathMatch: 'full' },

  // Auth
  {
    path: 'sign-in',
    loadComponent: () => import('./features/auth/sign-in').then(m => m.SignInPage),
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./features/auth/sign-up').then(m => m.SignUpPage),
  },
  {
    path: 'auth/sync',
    loadComponent: () => import('./features/auth/sync').then(m => m.SyncPage),
  },

  // Public
  {
    path: 'feed',
    loadComponent: () => import('./features/feed/feed').then(m => m.FeedPage),
  },
  {
    path: 'quests',
    loadComponent: () => import('./features/quests/quest-list').then(m => m.QuestListPage),
  },
  {
    path: 'quests/:id',
    loadComponent: () => import('./features/quests/quest-detail').then(m => m.QuestDetailPage),
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./features/leaderboard/leaderboard').then(m => m.LeaderboardPage),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search').then(m => m.SearchPage),
  },
  {
    path: 'profile/:username',
    loadComponent: () => import('./features/profile/profile').then(m => m.ProfilePage),
  },
  {
    path: 'community',
    loadComponent: () => import('./features/community/community').then(m => m.CommunityPage),
  },
  {
    path: 'submissions/:id',
    loadComponent: () => import('./features/submissions/submission-detail').then(m => m.SubmissionDetailPage),
  },

  // Protected
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardPage),
  },
  {
    path: 'submit/:questId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/submissions/submit').then(m => m.SubmitPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/admin').then(m => m.AdminPage),
  },

  // Fallback
  { path: '**', redirectTo: '/feed' },
];
