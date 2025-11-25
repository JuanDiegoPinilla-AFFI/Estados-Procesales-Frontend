import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment.prod';

// ... (Tus interfaces LoginPayload, RegisterPayload, etc. se mantienen igual)
export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
    role?: string;
}
export interface ResetPasswordPayload {
    email: string;
    token: string;
    password: string;
}
export interface UserData {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}api/auth/`;

  refreshUserProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}profile`).pipe(
      tap((user: any) => {
        this.saveUserData(user); 
      })
    );
  }
  
  constructor(private http: HttpClient) {}

  // -----------------------------
  // AUTH
  // -----------------------------
  register(data: RegisterPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}register`, data);
  }

  login(data: LoginPayload): Observable<any> {
    // Al hacer login, el servidor setea la cookie automáticamente.
    // Solo necesitamos guardar los datos del usuario para mostrar "Hola Juan"
    return this.http.post(`${this.apiUrl}login`, data).pipe(
      tap((response: any) => {
        if (response.user) {
           this.saveUserData(response.user);
        }
      })
    );
  }

  // Nuevo método para llamar al logout del servidor (borra la cookie)
  logout(): void {
    this.http.post(`${this.apiUrl}logout`, {}).subscribe({
      next: () => this.logoutClientSide(),
      error: () => this.logoutClientSide() // Si falla, igual limpiamos local
    });
  }

  // Limpieza solo visual (del navegador)
  logoutClientSide(): void {
    localStorage.removeItem('redelex_user');
    // Redirigir al login si fuera necesario, o dejar que el interceptor lo haga
  }

  // -----------------------------
  // USER DATA (Solo info pública)
  // -----------------------------
  saveUserData(userData: any): void { 
    const normalizedData = {
      id: userData.id || userData._id,
      name: userData.name || userData.nombre || '', // Preferimos 'name'
      email: userData.email || '',
      role: userData.role || userData.rol || 'user' // <--- CAMBIO CLAVE: Guardar como 'role'
    };
    localStorage.setItem('redelex_user', JSON.stringify(normalizedData));
  }

  getUserData(): UserData | null {
    const data = localStorage.getItem('redelex_user');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  // Verifica si hay usuario en local (para Guards visuales)
  // La seguridad REAL la hace el backend con la cookie
  isLoggedIn(): boolean {
    return !!localStorage.getItem('redelex_user'); 
  }

  activateAccount(email: string, token: string): Observable<any> {
    // Nota: El backend espera un POST con el body { email, token }
    return this.http.post(`${this.apiUrl}activate`, { email, token });
  }

  // -----------------------------
  // PASSWORD RESET
  // -----------------------------
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}request-password-reset`, { email });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}reset-password`, payload);
  }
}