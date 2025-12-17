import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

export const panelRedirectGuard: CanActivateFn = (): UrlTree | boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Verificamos si está logueado
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/auth/login']);
  }
  
  // Obtenemos la URL calculada en el servicio
  const targetUrl = authService.getRedirectUrl();
  
  // Retornamos el árbol de URL para que Angular redirija
  return router.createUrlTree([targetUrl]);
};