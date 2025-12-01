import { ApplicationConfig, LOCALE_ID } from '@angular/core'; // 1. Importar LOCALE_ID
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

// 2. Importaciones para el idioma Español (Colombia)
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';

import { routes } from './app.routes';
import { authInterceptor } from '../../features/auth/interceptors/auth-interceptor';

// Sistema de plugins
import { PluginRegistryService } from '../../core/services/plugin-registry.service';
import { AUTH_PLUGIN_CONFIG } from '../../features/auth/auth-plugin.config';
import { REDELEX_PLUGIN_CONFIG } from '../../features/redelex/redelex-plugin.config';

// 3. Registrar el idioma antes de exportar la config
registerLocaleData(localeEsCo, 'es-CO');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    PluginRegistryService,
    // 4. Proveer el ID de idioma globalmente
    { provide: LOCALE_ID, useValue: 'es-CO' }
  ]
};

export function initializePlugins(registry: PluginRegistryService): void {
  console.log('🔌 Inicializando plugins...');
  
  registry.register(AUTH_PLUGIN_CONFIG);
  registry.register(REDELEX_PLUGIN_CONFIG);
  
  console.log('✅ Plugins inicializados');
}