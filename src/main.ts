// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationStart } from '@angular/router';
import { appConfig, initializePlugins } from './app/shared/services/app.config';
import { PluginRegistryService } from './app/core/services/plugin-registry.service';
import { SplashService } from './app/shared/services/splash.service';
import { SplashComponent } from './app/shared/components/splash.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SplashComponent],
  template: `
    <app-splash [visible]="showSplash"></app-splash>
    <router-outlet></router-outlet>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  showSplash = true;
  private subscription?: any;
  
  constructor(
    private splashService: SplashService,
    private router: Router
  ) {}
  
  ngOnInit() {
    // Splash inicial
    this.splashService.show(1500);
    
    // Actualizar estado
    this.splashService.visible$.subscribe(visible => {
      this.showSplash = visible;
    });
    
    // Splash en navegaciones
    this.subscription = this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe(() => this.splashService.show(1500));
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}

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