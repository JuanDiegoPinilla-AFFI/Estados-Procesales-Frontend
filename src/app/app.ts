import { Component, signal } from '@angular/core';
import {
  RouterOutlet,
  ChildrenOutletContexts,
  Router,
  NavigationStart,
} from '@angular/router';
import { routeFadeAnimation } from './animations/route-animations';
import { SplashComponent } from './shared/splash';
import { SplashService } from './shared/services/splash';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SplashComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [routeFadeAnimation],
})
export class App {
  protected readonly title = signal('redelex-front');
  showSplash = false;

  constructor(
    private contexts: ChildrenOutletContexts,
    private router: Router,
    private splash: SplashService
  ) {
    // Escuchar el estado del splash
    this.splash.visible$.subscribe((visible) => {
      this.showSplash = visible;
    });

    // Mostrar splash en cada navegación
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.splash.show(1000); // 1 segundo
      }
    });
  }

  // Usado por la animación de rutas en el template
  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }
}
