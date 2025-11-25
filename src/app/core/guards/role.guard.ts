import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { AffiAlert } from '../../shared/services/affi-alert';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    // Obtenemos el usuario del localStorage (o del servicio)
    const user = authService.getUserData();
    
    // Validamos: Si existe usuario y su rol está en la lista permitida
    if (user && allowedRoles.includes(user.role || '')) {
      return true;
    }

    // Si no tiene permiso:
    AffiAlert.fire({
      icon: 'error',
      title: 'Acceso Denegado',
      text: 'No tienes permisos para acceder a esta sección.'
    });

    // Redirigir según el rol que tenga (para no dejarlo en el limbo)
    if (user?.role === 'user') {
      router.navigate(['/redelex/mis-procesos']);
    } else {
      router.navigate(['/redelex/consultar-proceso']); // O home admin
    }

    return false;
  };
};