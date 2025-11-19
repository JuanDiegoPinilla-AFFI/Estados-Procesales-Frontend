// src/app/features/redelex/redelex.routes.ts
// 🆕 Archivo NUEVO - Crear en la nueva carpeta features/redelex/

import { Routes } from '@angular/router';

export const REDELEX_ROUTES: Routes = [
  {
    path: 'consultar',
    loadComponent: () => 
      import('./pages/consultar-proceso/consultar-proceso')
        .then(m => m.ConsultarProcesoComponent),
    data: { 
      animation: 'ConsultarProcesoPage',
      title: 'Consultar Procesos'
    }
  },
  {
    path: '',
    redirectTo: 'consultar',
    pathMatch: 'full'
  }
];