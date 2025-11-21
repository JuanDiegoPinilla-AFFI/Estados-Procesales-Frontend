import { Routes } from '@angular/router';

export const REDELEX_ROUTES: Routes = [
  // TU RUTA EXISTENTE (Consultar Proceso)
  {
    path: 'consultar-proceso',
    loadComponent: () => 
      import('./pages/consultar-proceso/consultar-proceso') // Nota: ajusta la ruta si tu archivo se llama .ts o .component.ts
        .then(m => m.ConsultarProcesoComponent),
    data: { 
      animation: 'ConsultarProcesoPage',
      title: 'Consultar Procesos'
    }
  },

  // --- NUEVA RUTA AGREGADA (Informe Inmobiliar) ---
  {
    path: 'reporte-inmobiliaria',
    loadComponent: () => import('./pages/informe-inmobiliaria/informe-inmobiliaria')
      .then(m => m.InformeInmobiliariaComponent),
    data: {
      title: 'Reporte Inmobiliaria' // Opcional: para mantener consistencia con tus títulos
    }
  },

  // REDIRECCIÓN POR DEFECTO
  {
    path: '',
    redirectTo: 'consultar-proceso',
    pathMatch: 'full'
  }
];