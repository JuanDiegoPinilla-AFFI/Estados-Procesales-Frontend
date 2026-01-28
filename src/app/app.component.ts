import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { PluginRegistryService } from './core/services/plugin-registry.service';
import { SplashService } from './shared/services/splash.service';
import { SplashComponent } from './shared/components/splash.component';
import { AUTH_PLUGIN_CONFIG } from './features/auth/auth-plugin.config';
import { REDELEX_PLUGIN_CONFIG } from './features/redelex/redelex-plugin.config';
import { USERS_PLUGIN_CONFIG } from './features/users/users-plugin.config';
import { INMOBILIARIA_PLUGIN_CONFIG } from './features/inmobiliaria/inmobiliaria-plugin.config';
import { routeFadeAnimation } from './animations/route-animations';

import { IntercomService } from './core/services/intercom.service';
import { AuthService, UserData } from './features/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SplashComponent],
  templateUrl: './app.component.html',
  animations: [routeFadeAnimation]
})
export class AppComponent implements OnInit, OnDestroy {
  showSplash = true;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private splashService: SplashService,
    private router: Router,
    private pluginRegistry: PluginRegistryService,
    private intercom: IntercomService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    console.log('🔌 Inicializando plugins del sistema...');
    this.pluginRegistry.register(AUTH_PLUGIN_CONFIG);
    this.pluginRegistry.register(REDELEX_PLUGIN_CONFIG);
    this.pluginRegistry.register(USERS_PLUGIN_CONFIG);
    this.pluginRegistry.register(INMOBILIARIA_PLUGIN_CONFIG);

    this.splashService.show(1500);

    this.splashService.visible$
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => (this.showSplash = visible));

    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.splashService.show(1500));

    // Intercom: boot anónimo (si quieres solo con login, quita esto)
    this.intercom.boot();

    // Intercom: login/logout/refresh
    this.auth.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: UserData | null) => {
        if (!user?.id) {
          this.intercom.shutdown();
          return;
        }

        // 👇 arma payload sin romper tipos
        const payload: any = {
          user_id: String(user.id),
          name: user.name,
          email: user.email,
        };

        // ✅ Empresa (si existe en tu user)
        // (por ahora NO existe en UserData; lo dejé protegido para que compile)
        const u = user as any;
        const companyId = u.codigoInmobiliaria || u.nit;
        const companyName = u.nombreInmobiliaria;

        if (companyId) {
          payload.companies = [{
            company_id: String(companyId),
            name: companyName || 'Inmobiliaria',
          }];
        }

        this.intercom.update(payload);
      });

    // opcional: update por navegación (actividad)
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationEnd)
      )
      .subscribe(() => this.intercom.update());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.intercom.shutdown();
  }

  getRouteAnimationData() {
    const route = this.router.routerState.root.firstChild;
    return route?.snapshot.data['animation'];
  }
}
