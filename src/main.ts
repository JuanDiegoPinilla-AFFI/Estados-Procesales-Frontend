import { bootstrapApplication } from '@angular/platform-browser';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { appConfig, initializePlugins } from './app/shared/services/app.config';
import { PluginRegistryService } from './app/core/services/plugin-registry.service';
import { SplashService } from './app/shared/services/splash.service';
import { SplashComponent } from './app/shared/components/splash.component';

// Componente raíz con Splash
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SplashComponent],
  template: `
    <app-splash [visible]="showSplash"></app-splash>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  showSplash = true;

  constructor(private splashService: SplashService) {}

  ngOnInit() {
    this.splashService.show(1500);
    
    this.splashService.visible$.subscribe(visible => {
      this.showSplash = visible;
    });
  }
}

async function bootstrap() {
  try {
    console.log('🚀 Iniciando Redelex Panel...');
    
    const appRef = await bootstrapApplication(AppComponent, appConfig);
    const pluginRegistry = appRef.injector.get(PluginRegistryService);
    
    initializePlugins(pluginRegistry);
    
    console.log('✅ Aplicación iniciada');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

bootstrap();