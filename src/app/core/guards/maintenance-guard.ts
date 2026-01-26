import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const maintenanceGuard: CanActivateFn = (route, state) => {
  const http = inject(HttpClient);
  const router = inject(Router);

  if (state.url === '/mantenimiento') return true;

  // CORRECCIÓN 1: Quitamos la barra final si existe en el environment para evitar "//"
  const baseUrl = environment.apiUrl.endsWith('/') 
    ? environment.apiUrl.slice(0, -1) 
    : environment.apiUrl;

  // CORRECCIÓN 2: ¿Tu API usa prefijo global? (Ej: /api)
  // Si tus otros endpoints son localhost:4000/api/auth/login, entonces agrega '/api' aquí.
  // Si no estás seguro, prueba primero sin '/api', y si falla, agrégalo.
  const apiUrl = `${baseUrl}/api/system-settings/status`;
  
  console.log('🔍 Consultando estado en:', apiUrl); // Para depurar

  return http.get<any>(apiUrl).pipe(
    map(response => {
      console.warn('📢 DATOS RECIBIDOS DEL BACKEND:', response); // Mira esto en la consola F12

      // Verificamos ambas posibilidades por seguridad
      if (response.maintenance === true || response.isActive === true) {
        router.navigate(['/mantenimiento']);
        return false;
      }
      return true;
    }),
    catchError((error) => {
      console.error('🔴 ERROR CONSULTANDO MANTENIMIENTO:', error);
      // Por ahora, si falla, BLOQUEA para probar si es un error de conexión
      // router.navigate(['/mantenimiento']); 
      // return of(false);
      return of(true);
    })
  );
};