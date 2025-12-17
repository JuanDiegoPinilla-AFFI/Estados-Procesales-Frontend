import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { roleGuard } from '../../core/guards/role.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AuthService } from '../auth/services/auth.service';

/**
 * Guard que delega la decisión al AuthService.
 * Mantiene una única fuente de verdad para las redirecciones.
 */
const smartDefaultRedirect = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // 1. Si no hay usuario, fuera.
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/auth/login']);
  }

  // 2. Usamos la lógica centralizada que creamos antes.
  // Esto devuelve '/panel/consultas/dashboard' o la que corresponda al rol.
  const targetUrl = authService.getRedirectUrl();
  
  // 3. Navegamos
  router.navigate([targetUrl]);
  
  // Retornamos false para cancelar la navegación a la ruta vacía ''
  // y permitir que el router procese la nueva navegación.
  return false; 
};

export const REDELEX_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard-inmobiliaria/dashboard-inmobiliaria.component')
          .then(m => m.DashboardInmobiliariaComponent),
        canActivate: [permissionGuard('procesos:view_own')] 
      },
      {
        path: 'mis-procesos',
        loadComponent: () => import('./pages/mis-procesos/mis-procesos')
          .then(m => m.MisProcesosComponent),
        canActivate: [permissionGuard('procesos:view_own')] 
      },
      {
        path: 'consultar-proceso',
        loadComponent: () => import('./pages/consultar-proceso/consultar-proceso')
          .then(m => m.ConsultarProcesoComponent),
        canActivate: [permissionGuard('procesos:view_all')]
      },
      {
        path: 'informe-inmobiliaria',
        loadComponent: () => import('./pages/informe-inmobiliaria/informe-inmobiliaria')
          .then(m => m.InformeInmobiliariaComponent),
        canActivate: [permissionGuard('reports:view')]
      },
      {
        path: 'proceso/:id',
        loadComponent: () => import('./pages/detalle-proceso/detalle-proceso')
          .then(m => m.DetalleProcesoComponent),
        // Aquí está bien usar roleGuard o permissionGuard según prefieras
        canActivate: [roleGuard(['admin', 'affi', 'inmobiliaria'])]
      },
      // RUTA DEFAULT
      {
        path: '',
        canActivate: [smartDefaultRedirect],
        children: [] 
      }
    ]
  }
];