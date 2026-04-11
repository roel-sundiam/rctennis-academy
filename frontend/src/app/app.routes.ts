import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'book',
    loadComponent: () =>
      import('./features/booking/booking.component').then(m => m.BookingComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'schedule',
    loadComponent: () =>
      import('./features/schedule/schedule.component').then(m => m.ScheduleComponent)
  },
  {
    path: 'admin/analytics',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/analytics/analytics.component').then(m => m.AnalyticsComponent)
  },
  { path: '**', redirectTo: '' }
];
