import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, EMPTY } from 'rxjs'; // <--- 1. IMPORTAR EMPTY
import { AuthService } from '../services/auth.service';
import { AffiAlert } from '../../../shared/services/affi-alert'; // Importa tu alerta si quieres avisar del cierre

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const cloned = req.clone({
    withCredentials: true 
  });

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {

      // --- NUEVA CONDICIÓN DE EXCEPCIÓN ---
      // Si el error viene del Login, lo ignoramos aquí para que el componente Login
      // pueda mostrar su propio mensaje específico (ej: "Cuenta desactivada").
      if (req.url.includes('/auth/login')) {
        return throwError(() => error);
      }
      // ------------------------------------
      
      // Si es 401 y NO es login (es decir, estaba navegando y se venció la sesión)
      if (error.status === 401) {
        
        AffiAlert.fire({
          icon: 'warning',
          title: 'Sesión Finalizada',
          text: 'Tu sesión ha expirado o tu cuenta ha cambiado de estado.',
          timer: 3000,
          timerProgressBar: true
        });

        authService.logoutClientSide();
        router.navigate(['/auth/login']);

        return EMPTY; 
      }

      return throwError(() => error);
    })
  );
};