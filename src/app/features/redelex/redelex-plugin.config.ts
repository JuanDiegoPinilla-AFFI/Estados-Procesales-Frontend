// src/app/features/redelex/redelex-plugin.config.ts

import { PluginConfig } from '../../core/models/plugin.interface';
import { REDELEX_ROUTES } from './redelex.routes';

export const REDELEX_PLUGIN_CONFIG: PluginConfig = {
  id: 'redelex',
  name: 'Consulta de Procesos',
  version: '1.0.0',
  enabled: true,
  description: 'Consulta y gestión de procesos legales de Redelex',
  
  // Items que se agregarán automáticamente al menú
  menuItems: [
    {
      id: 'redelex-mis-procesos',
      label: 'Mis Procesos',
      icon: 'folder',
      route: '/panel/consultas/mis-procesos',
      matchRoutes: ['/panel/consultas/proceso'],
      roles: ['inmobiliaria', 'admin'],
      permissions: ['procesos:view_own'],
      enabled: true,
      order: 1,
      sectionId: 'consultas'
    },
    {
      id: 'redelex-consultar',
      label: 'Consultar Procesos',
      icon: 'search',
      route: '/panel/consultas/consultar-proceso',
      roles: ['admin', 'affi'], 
      permissions: ['procesos:view_all'],
      enabled: true,
      order: 2,
      sectionId: 'consultas'
    },
    {
      id: 'redelex-informe',
      label: 'Informe Inmobiliaria',
      icon: 'bar-chart-2', 
      route: '/panel/consultas/informe-inmobiliaria',
      roles: ['admin', 'affi'],
      permissions: ['reports:view'],
      enabled: true,
      order: 3,
      sectionId: 'reportes'
    }
  ],
  
  routes: REDELEX_ROUTES,
  
  dependencies: ['auth']
};