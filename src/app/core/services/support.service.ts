import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

export interface TicketMetadata {
  procesoId?: number | string;
  radicado?: string;
  despacho?: string;
  etapa?: string;
}

interface HubSpotConversations {
  widget: {
    refresh: () => void;
    load: () => void;
    remove: () => void;
    status: () => { loaded: boolean };
  };
  clear: (payload: { resetUUID: boolean }) => void;
}

declare global {
  interface Window {
    hsConversationsSettings?: any;
    HubSpotConversations?: HubSpotConversations;
  }
}

@Injectable({ providedIn: 'root'})
export class SupportService {
  private apiUrl = `${environment.apiUrl}api/support`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  createTicket(subject: string, content: string, metadata?: TicketMetadata, email?: string) {
    const body: any = { subject, content, metadata };
    if (email) body.email = email;
    return this.http.post(`${this.apiUrl}/ticket`, body);
  }

  identifyUser() {
    const userData = this.authService.getUserData();
    
    if (!userData?.email) return;

    this.http.get<{token: string, email: string}>(`${this.apiUrl}/chat-token`).subscribe({
      next: (res) => {
        window.hsConversationsSettings = {
          identificationEmail: res.email,
          identificationToken: res.token,
          loadImmediately: false, 
          customProperties: { 
            plataforma_origen: 'Redelex_Front',
            fecha_ultimo_login: new Date().toISOString(),
            rol_usuario: userData.role,
            nit_inmobiliaria: userData.nit, 
            nombre_usuario: userData.name
          }
        };

        if (window.HubSpotConversations && window.HubSpotConversations.widget) {
          const widget = window.HubSpotConversations.widget;
          if (widget.status && widget.status().loaded) {
            widget.refresh();
          } else {
            widget.load();
          }
        }
      },
      error: (err) => console.error('Error identificando usuario:', err)
    });
  }

  loadGuestChat() {
    window.hsConversationsSettings = {
      loadImmediately: false,
      identificationEmail: undefined,
      identificationToken: undefined
    };

    if (window.HubSpotConversations?.widget) {
      const widget = window.HubSpotConversations.widget;
      if (widget.status && widget.status().loaded) {
        widget.refresh(); 
      } else {
        widget.load();
      }
    }
  }

  clearIdentity() {
    // 1. Limpiamos la configuración en memoria
    window.hsConversationsSettings = {};

    if (window.HubSpotConversations) {
      // 2. Ejecutamos el "Hard Reset" para borrar la cookie de rastreo
      // Esto es lo que te faltaba para que HubSpot olvide al usuario anterior
      if (typeof window.HubSpotConversations.clear === 'function') {
        window.HubSpotConversations.clear({ resetUUID: true });
      } else if (window.HubSpotConversations.widget) {
        // Fallback por si la API falla, aunque clear() es el estándar
        window.HubSpotConversations.widget.remove();
      }
    }
  }
}