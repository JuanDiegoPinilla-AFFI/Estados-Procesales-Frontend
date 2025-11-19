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
      route: '/dashboard/redelex/consultar',
      roles: ['user', 'admin'],
      enabled: true,
      order: 1
    }
  ],
  
  routes: REDELEX_ROUTES,
  
  dependencies: ['auth']
};