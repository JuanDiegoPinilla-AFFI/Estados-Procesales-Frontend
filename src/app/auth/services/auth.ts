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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:4000/api/auth';

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

  logout(): void {
    localStorage.removeItem('redelex_token');
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
