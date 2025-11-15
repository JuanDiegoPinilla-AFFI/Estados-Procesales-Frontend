// dashboard.routes.ts
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard';
import { ConsultarProcesoComponent } from './pages/consultar-proceso/consultar-proceso';
import { authGuard } from '../auth/guards/auth-guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'consultar',
        component: ConsultarProcesoComponent,
        data: { animation: 'ConsultarProcesoPage' }
      },
      {
        path: '',
        redirectTo: 'consultar',
        pathMatch: 'full'
      }
    ]
  }
];