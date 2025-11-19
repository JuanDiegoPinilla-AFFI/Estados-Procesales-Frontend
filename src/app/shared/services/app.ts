import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { appConfig, initializePlugins } from './app.config';
import { PluginRegistryService } from '../../core/services/plugin-registry.service';

// Componente raíz temporal
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {}

async function bootstrap() {
  try {
    console.log('🚀 Iniciando Estados Procesales...');
    
    const appRef = await bootstrapApplication(AppComponent, appConfig);
    const pluginRegistry = appRef.injector.get(PluginRegistryService);
    
    initializePlugins(pluginRegistry);
    
    console.log('✅ Aplicación iniciada');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

bootstrap();