import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard'; 
import { panelRedirectGuard } from './core/guards/panel-redirect.guard'; 

// 1. IMPORTAR EL GUARD Y EL COMPONENTE NUEVOS
import { maintenanceGuard } from './core/guards/maintenance-guard';
import { MaintenancePageComponent } from './features/maintenance/pages/maintenance-page';

export const routes: Routes = [
  // 2. NUEVA RUTA: Esta debe ir libre, sin guards, para que no haga bucle infinito
  {
    path: 'mantenimiento',
    component: MaintenancePageComponent
  },
  {
    path: '',
    redirectTo: '/panel',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    // 3. APLICAR GUARD AQUÍ: Bloquea el login también si hay mantenimiento
    canActivate: [maintenanceGuard],
    loadChildren: () => 
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'panel',
    loadComponent: () => 
      import('./core/layout/shell-layout/shell-layout.component')
        .then(m => m.ShellLayoutComponent),
    // 4. APLICAR GUARD AQUÍ: Es vital que vaya PRIMERO en la lista
    canActivate: [
      maintenanceGuard, // <--- Primero verifica mantenimiento. Si es true, te saca.
      roleGuard([       // <--- Solo si no hay mantenimiento, verifica roles.
        'admin', 
        'affi', 
        'inmobiliaria', 
        'gerente_comercial', 
        'director_comercial', 
        'gerente_cuenta'
      ])
    ],
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