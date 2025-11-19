import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from '../../features/auth/interceptors/auth-interceptor';

// Sistema de plugins
import { PluginRegistryService } from '../../core/services/plugin-registry.service';
import { AUTH_PLUGIN_CONFIG } from '../../features/auth/auth-plugin.config';
import { REDELEX_PLUGIN_CONFIG } from '../../features/redelex/redelex-plugin.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    PluginRegistryService
  ]
};

export function initializePlugins(registry: PluginRegistryService): void {
  console.log('🔌 Inicializando plugins...');
  
  registry.register(AUTH_PLUGIN_CONFIG);
  registry.register(REDELEX_PLUGIN_CONFIG);
  
  console.log('✅ Plugins inicializados');
}