import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { roleGuard } from '../../core/guards/role.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AuthService } from '../auth/services/auth.service';

const smartDefaultRedirect = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/auth/login']);
  }

  const targetUrl = authService.getRedirectUrl();
  router.navigate([targetUrl]);
  
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
        canActivate: [roleGuard([
          'admin', 
          'affi', 
          'gerente_comercial', 
          'director_comercial', 
          'gerente_cuenta'
        ])]
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
        canActivate: [roleGuard(['admin', 'affi', 'inmobiliaria'])]
      },
      {
        path: 'llamada',
        loadComponent: () => import('./pages/call-center/call-center.component')
          .then(m => m.CallCenterComponent),
        canActivate: [permissionGuard('call:create')]
      },
      {
        path: '',
        canActivate: [smartDefaultRedirect],
        children: [] 
      }
    ]
  }
];