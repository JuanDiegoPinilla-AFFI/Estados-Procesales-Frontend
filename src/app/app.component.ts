import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { PluginRegistryService } from './core/services/plugin-registry.service';
import { SplashService } from './shared/services/splash.service';
import { SplashComponent } from './shared/components/splash.component';
import { AUTH_PLUGIN_CONFIG } from './features/auth/auth-plugin.config';
import { REDELEX_PLUGIN_CONFIG } from './features/redelex/redelex-plugin.config';
import { USERS_PLUGIN_CONFIG } from './features/users/users-plugin.config';
import { INMOBILIARIA_PLUGIN_CONFIG } from './features/inmobiliaria/inmobiliaria-plugin.config';
import { routeFadeAnimation } from './animations/route-animations';
import { AuthService } from './features/auth/services/auth.service';
import { SupportService } from './core/services/support.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SplashComponent],
  templateUrl: './app.component.html',
  animations: [routeFadeAnimation]
})
export class AppComponent implements OnInit, OnDestroy {
  showSplash = true;
  private subscription?: Subscription;
  private chatSubscription?: Subscription;
  
  constructor(
    private splashService: SplashService,
    private router: Router,
    private pluginRegistry: PluginRegistryService,
    private authService: AuthService,
    private supportService: SupportService
  ) {}
  
  ngOnInit() {
    console.log('🔌 Inicializando plugins del sistema...');
    this.pluginRegistry.register(AUTH_PLUGIN_CONFIG);
    this.pluginRegistry.register(REDELEX_PLUGIN_CONFIG);
    this.pluginRegistry.register(USERS_PLUGIN_CONFIG);
    this.pluginRegistry.register(INMOBILIARIA_PLUGIN_CONFIG);
    
    this.splashService.show(1500);
    this.splashService.visible$.subscribe(visible => {
      this.showSplash = visible;
    });

    this.subscription = this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe(() => this.splashService.show(1500));

    this.chatSubscription = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      const isLoggedIn = this.authService.isLoggedIn();
      
      if (!isLoggedIn) {
        this.supportService.loadGuestChat();
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.chatSubscription?.unsubscribe();
  }

  getRouteAnimationData() {
    const route = this.router.routerState.root.firstChild;
    return route?.snapshot.data['animation'];
  }
}