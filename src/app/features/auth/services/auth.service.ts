import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
    role?: string;
    nit?: string; 
    codigoInmobiliaria?: string;
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
    permissions?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}api/auth/`;

  constructor(private http: HttpClient) {}

  refreshUserProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}profile`).pipe(
      tap((user: any) => {
        this.saveUserData(user); 
      })
    );
  }
  
  register(data: RegisterPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}register`, data);
  }

  login(data: LoginPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}login`, data).pipe(
      tap((response: any) => {
        if (response.user) {
          this.saveUserData(response.user);
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}logout`, {}).pipe(
      finalize(() => { 
        this.logoutClientSide();
      })
    );
  }

  logoutClientSide(): void {
    localStorage.removeItem('redelex_user');
  }

  saveUserData(userData: any): void { 
    const normalizedData: UserData = {
      id: userData.id || userData._id,
      name: userData.name || userData.nombre || '',
      email: userData.email || '',
      role: userData.role || userData.rol || 'inmobiliaria',
      permissions: userData.permissions || []
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

  isLoggedIn(): boolean {
    return !!localStorage.getItem('redelex_user');
  }

  isAdmin(): boolean {
    const user = this.getUserData();
    return user?.role === 'admin';
  }

  hasPermission(requiredPermission: string): boolean {
    const user = this.getUserData();
    if (!user) return false;

    if (user.role === 'admin') return true;

    return user.permissions?.includes(requiredPermission) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    const user = this.getUserData();
    if (!user) return false;
    if (user.role === 'admin') return true;

    return permissions.some(p => user.permissions?.includes(p));
  }

  getRedirectUrl(): string {
    const user = this.getUserData();
    const role = user?.role?.toLowerCase(); 

    switch (role) {
      case 'admin':
        return '/panel/usuarios';
      
    case 'gerente_comercial':
    case 'director_comercial':
    case 'gerente_cuenta':
      return '/panel/consultas/consultar-proceso';
        
      case 'inmobiliaria':
        return '/panel/consultas/dashboard';
        
      default:
        return '/panel/consultas/consultar-proceso';
    }
  }

  activateAccount(email: string, token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}activate`, { email, token });
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}request-password-reset`, { email });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}reset-password`, payload);
  }
}