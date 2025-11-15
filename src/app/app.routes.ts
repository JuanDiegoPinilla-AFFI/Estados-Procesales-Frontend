import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./auth/auth.routes').then(m => m.AUTH_ROUTES),
    data: { animation: 'AuthPage' }
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
    data: { animation: 'DashboardPage' }
  },
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
        import('./auth/pages/forgot-password/forgot-password')
        .then(m => m.ForgotPasswordComponent),
    data: { animation: 'ForgotPasswordPage' }
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
        import('./auth/pages/reset-password/reset-password')
        .then(m => m.ResetPasswordComponent),
    data: { animation: 'ResetPasswordPage' }
  },
];