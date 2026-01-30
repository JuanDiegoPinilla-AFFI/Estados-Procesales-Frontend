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
  nombreRepresentante?: string;
  emailRepresentante?: string;
  fechaInicioFianza?: string | Date;
  modifiedBy?: string;
  tieneProcesos?: boolean;
}

export interface ImportResult {
  message: string;
  resumen: {
    procesados_origen: number;
    nuevos: number;
    actualizados: number;
    inactivados: number;
  };
}

export interface InmobiliariaEstadisticasProcesos {
  totalInmobiliariasConProcesos: number;
  activas: {
    cantidad: number;
    porcentaje: number;
  };
  inactivas: {
    cantidad: number;
    porcentaje: number;
  };
    otrosDemandantes: {
    cantidad: number;
    porcentaje: number;
  };
}

export interface InmobiliariaEstadisticasUsuarios {
  totalInmobiliariasConProcesos: number;
  conUsuarioActivo: {
    cantidad: number;
    porcentaje: number;
  };
  conUsuarioInactivo: {
    cantidad: number;
    porcentaje: number;
  };
  sinUsuario: {
    cantidad: number;
    porcentaje: number;
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

  update(id: string, data: Partial<Inmobiliaria>): Observable<Inmobiliaria> {
    return this.http.put<Inmobiliaria>(`${this.apiUrl}/${id}`, data);
  }

  toggleStatus(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, {});
  }

  importInmobiliarias(file: File): Observable<HttpEvent<ImportResult>> {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.apiUrl}/import`, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request(req);
  }
  
  triggerImportReminder(): Observable<any> {
    return this.http.get(`${this.apiUrl}/send-import-reminder`);
  }
  
  getEstadisticasConProcesos(): Observable<InmobiliariaEstadisticasProcesos> {
    return this.http.get<InmobiliariaEstadisticasProcesos>(`${this.apiUrl}/estadisticas/con-procesos`);
  }
 
  getEstadisticasUsuariosConProcesos(): Observable<InmobiliariaEstadisticasUsuarios> {
    return this.http.get<InmobiliariaEstadisticasUsuarios>(`${this.apiUrl}/estadisticas/usuarios-con-procesos`);
  }

  getDetallePorNit(nit: string): Observable<Inmobiliaria> {
    return this.http.get<Inmobiliaria>(`${this.apiUrl}/detalle-modal/${nit}`);
  }
}