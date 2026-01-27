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

  const baseUrl = environment.apiUrl.endsWith('/') 
    ? environment.apiUrl.slice(0, -1) 
    : environment.apiUrl;

  const apiUrl = `${baseUrl}/api/system-settings/status`;
  
  console.log('🔍 Consultando estado en:', apiUrl);

  return http.get<any>(apiUrl).pipe(
    map(response => {
      if (response.maintenance === true || response.isActive === true) {
        router.navigate(['/mantenimiento']);
        return false;
      }
      return true;
    }),
    catchError((error) => {
      console.error('🔴 ERROR CONSULTANDO MANTENIMIENTO:', error);
      return of(true);
    })
  );
};