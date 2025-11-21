// src/app/features/redelex/redelex-plugin.config.ts
// 🆕 Archivo NUEVO - Crear en la nueva carpeta features/redelex/

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
      id: 'redelex-consultar',
      label: 'Consultar Procesos',
      icon: 'file-text',
      route: '/panel/consultas/consultar-proceso',
      roles: ['user', 'admin'],
      enabled: true,
      order: 1
    },
    {
      id: 'redelex-informe',
      label: 'Reporte Inmobiliaria',
      icon: 'file-text',
      route: '/panel/consultas/reporte-inmobiliaria',
      roles: ['user', 'admin'],
      enabled: true,
      // badge: 'Nuevo',
      order: 2
    }
  ],
  
  routes: REDELEX_ROUTES,
  
  dependencies: ['auth']
};