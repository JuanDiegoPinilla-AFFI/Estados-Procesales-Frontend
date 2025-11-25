import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard'; // <--- Importar
import { ConsultarProcesoComponent } from './pages/consultar-proceso/consultar-proceso';
import { MisProcesosComponent } from './pages/mis-procesos/mis-procesos';
// ... otros imports

export const REDELEX_ROUTES: Routes = [
  {
    path: '',
    children: [
      // 1. RUTA NUEVA: Solo para Inmobiliarias (User)
      {
        path: 'mis-procesos',
        component: MisProcesosComponent,
        canActivate: [roleGuard(['user', 'admin'])] // Admin también puede ver por debug si quieres
      },
      
      // 2. RUTAS VIEJAS: Restringidas SOLO a Admins
      {
        path: 'consultar-proceso',
        component: ConsultarProcesoComponent,
        canActivate: [roleGuard(['admin'])] // <--- CANDADO
      },
      {
        path: 'informe-inmobiliaria',
        // ... componente de informe ...
        canActivate: [roleGuard(['admin'])] // <--- CANDADO
      },
      
      // 3. DETALLE: Accesible por ambos (El backend decide si muestra datos)
      {
        path: 'proceso/:id',
        loadComponent: () => import('./pages/detalle-proceso/detalle-proceso').then(m => m.DetalleProcesoComponent),
        canActivate: [roleGuard(['admin', 'user'])]
      },
      
      {
        path: '',
        redirectTo: 'mis-procesos', // O lógica para redirigir según rol
        pathMatch: 'full'
      }
    ]
  }
];