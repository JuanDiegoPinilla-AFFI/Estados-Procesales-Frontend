/*
  Cambios (30-12-2025) - Santiago Obando:
  - `createTicket` ahora acepta un parámetro opcional `email` y lo incluye en el cuerpo
    de la petición si está presente.
  - Motivo: enviar el email ingresado por el usuario al backend para usarlo como reply-to.
*/
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TicketMetadata {
  procesoId?: number | string;
  radicado?: string;
  despacho?: string;
  etapa?: string;
}

@Injectable({
  providedIn: 'root'
})

export class SupportService {
  private apiUrl = `${environment.apiUrl}api/support/ticket`;

  constructor(private http: HttpClient) {}

  createTicket(subject: string, content: string, metadata?: TicketMetadata, email?: string) {
    const body: any = { subject, content, metadata };
    if (email) body.email = email;
    return this.http.post(this.apiUrl, body);
  }
}