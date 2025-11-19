import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'https://redelex-ayhxghaje6c3gkaz.eastus-01.azurewebsites.net/api/auth';

  constructor(private http: HttpClient) {}

  // -----------------------------
  // AUTH
  // -----------------------------
  register(data: RegisterPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: LoginPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }

  // -----------------------------
  // TOKEN
  // -----------------------------
  saveToken(token: string): void {
    localStorage.setItem('redelex_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('redelex_token');
  }

  // -----------------------------
  // USER DATA
  // -----------------------------
  saveUserData(userData: UserData): void {
    const normalizedData = {
      id: userData.id,
      nombre: userData.name || '',
      email: userData.email || '',
      rol: userData.role || 'Usuario'
    };
    localStorage.setItem('redelex_user', JSON.stringify(normalizedData));
  }

  getUserData(): UserData | null {
    const data = localStorage.getItem('redelex_user');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
        return null;
      }
    }
    return null;
  }

  // -----------------------------
  // LOGOUT
  // -----------------------------
  logout(): void {
    localStorage.removeItem('redelex_token');
    localStorage.removeItem('redelex_user');
  }

  // -----------------------------
  // PASSWORD RESET
  // -----------------------------
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-password-reset`, { email });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, payload);
  }
}