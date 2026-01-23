import { PluginConfig } from '../../core/models/plugin.interface';
import { REDELEX_ROUTES } from './redelex.routes';

export const REDELEX_PLUGIN_CONFIG: PluginConfig = {
  id: 'redelex',
  name: 'Consulta de Procesos',
  version: '1.0.0',
  enabled: true,
  description: 'Consulta y gestión de procesos legales de Redelex',
  
  menuItems: [
    {
      id: 'redelex-dashboard',
      label: 'Tablero de Control',
      icon: 'pie-chart',
      route: '/panel/consultas/dashboard',
      roles: ['inmobiliaria', 'admin'],
      permissions: ['procesos:view_own'],
      enabled: true,
      order: 1, 
      sectionId: 'consultas'
    },
    {
      id: 'redelex-mis-procesos',
      label: 'Mis Procesos',
      icon: 'folder',
      route: '/panel/consultas/mis-procesos',
      matchRoutes: ['/panel/consultas/proceso'],
      roles: ['inmobiliaria', 'admin'],
      permissions: ['procesos:view_own'],
      enabled: true,
      order: 2,
      sectionId: 'consultas'
    },
    {
      id: 'redelex-consultar',
      label: 'Consultar Procesos',
      icon: 'search',
      route: '/panel/consultas/consultar-proceso',
      roles: ['admin', 'affi', 'gerente_comercial', 'director_comercial', 'gerente_cuenta'], 
      permissions: ['procesos:view_all'],
      enabled: true,
      order: 3,
      sectionId: 'consultas'
    },
    {
      id: 'redelex-informe',
      label: 'Informe Inmobiliaria',
      icon: 'bar-chart-2', 
      route: '/panel/consultas/informe-inmobiliaria',
      roles: ['admin', 'affi', 'gerente_comercial', 'director_comercial', 'gerente_cuenta'],
      permissions: ['reports:view'],
      enabled: true,
      order: 4,
      sectionId: 'reportes'
    },
    {
      id: 'redelex-llamada',
      label: 'Centro de Llamadas',
      icon: 'phone-call',
      route: '/panel/consultas/llamada',
      roles: ['admin'],
      permissions: ['call:create'],
      enabled: true,
      order: 5,
      sectionId: 'reportes'
    }
  ],
  
  routes: REDELEX_ROUTES,
  
  dependencies: ['auth']
};