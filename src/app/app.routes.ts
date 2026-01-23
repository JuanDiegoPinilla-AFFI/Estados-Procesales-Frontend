import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard'; 
import { panelRedirectGuard } from './core/guards/panel-redirect.guard'; 

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/panel',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => 
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'panel',
    loadComponent: () => 
      import('./core/layout/shell-layout/shell-layout.component')
        .then(m => m.ShellLayoutComponent),
    canActivate: [roleGuard([
      'admin', 
      'affi', 
      'inmobiliaria', 
      'gerente_comercial', 
      'director_comercial', 
      'gerente_cuenta'
    ])],
    children: [
      {
        path: 'consultas',
        loadChildren: () => 
          import('./features/redelex/redelex.routes').then(m => m.REDELEX_ROUTES)
      },
      {
        path: 'usuarios',
        loadChildren: () => 
          import('./features/users/users.routes').then(m => m.USERS_ROUTES)
      },
      {
        path: 'inmobiliarias',
        loadChildren: () => import('./features/inmobiliaria/inmobiliaria.routes')
          .then(m => m.INMOBILIARIA_ROUTES)
      },
      {
        path: '',
        canActivate: [panelRedirectGuard],
        loadComponent: () => 
          import('./core/components/empty-redirect/empty-redirect.component')
            .then(m => m.EmptyRedirectComponent),
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];