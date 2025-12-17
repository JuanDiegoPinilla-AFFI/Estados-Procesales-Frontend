import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Inmobiliaria {
  _id: string;
  nombreInmobiliaria: string;
  nit: string;
  codigo: string;
  emailRegistrado?: string;
  isActive: boolean;
  updatedAt?: string;
  departamento?: string;
  ciudad?: string;
  telefono?: string;
  emailContacto?: string;
  fechaInicioFianza?: string | Date;
  modifiedBy?: string;
}

export interface ImportResult {
  message: string;
  resumen: {
    procesados_excel: number;
    nuevos: number;
    actualizados: number;
    inactivados: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InmobiliariaService {
  private apiUrl = `${environment.apiUrl}api/inmobiliarias`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Inmobiliaria[]> {
    return this.http.get<Inmobiliaria[]>(this.apiUrl);
  }

  // Actualizar datos básicos (si quisieras editar manual)
  update(id: string, data: Partial<Inmobiliaria>): Observable<Inmobiliaria> {
    return this.http.put<Inmobiliaria>(`${this.apiUrl}/${id}`, data);
  }

  toggleStatus(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, {});
  }

  // --- IMPORTACIÓN MASIVA CON PROGRESO ---
  importInmobiliarias(file: File): Observable<HttpEvent<ImportResult>> {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.apiUrl}/import`, formData, {
      reportProgress: true, // Habilita la barra de progreso
      responseType: 'json'
    });

    return this.http.request(req);
  }
}