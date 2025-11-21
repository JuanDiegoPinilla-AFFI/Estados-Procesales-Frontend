import { Routes } from '@angular/router';
import { authGuard } from '../../features/auth/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/panel',
    pathMatch: 'full'
  },

  {
    path: 'auth',
    loadChildren: () => 
      import('../../features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  {
    path: 'panel',
    loadComponent: () => 
      import('../../core/layout/shell-layout/shell-layout.component')
        .then(m => m.ShellLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'consultas',
        loadChildren: () => 
          import('../../features/redelex/redelex.routes')
            .then(m => m.REDELEX_ROUTES)
      },
      {
        path: '',
        redirectTo: 'consultas/consultar-proceso',
        pathMatch: 'full'
      }
    ]
  },

  {
    path: '**',
    redirectTo: '/panel'
  }
];