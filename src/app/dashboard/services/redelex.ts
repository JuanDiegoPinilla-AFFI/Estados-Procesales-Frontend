import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.prod';

export interface ProcesoResumenDto {
  procesoId: number;
  demandadoNombre: string;
  demandadoIdentificacion: string;
  demandanteNombre: string;
  demandanteIdentificacion: string;
}

export interface ProcesosPorIdentificacionResponse {
  success: boolean;
  identificacion: string;
  procesos: ProcesoResumenDto[];
}

export interface ProcesoDetalleDto {
  idProceso: number;
  numeroRadicacion: string | null;
  codigoAlterno: string | null;

  claseProceso: string | null;
  etapaProcesal: string | null;
  estado: string | null;
  regional: string | null;
  tema: string | null;

  demandanteNombre: string | null;
  demandanteIdentificacion: string | null;
  demandadoNombre: string | null;
  demandadoIdentificacion: string | null;

  despacho: string | null;
  despachoOrigen: string | null;

  fechaAdmisionDemanda: string | null;
  fechaCreacion: string | null;
  fechaEntregaAbogado: string | null;
  fechaRecepcionProceso: string | null;

  ubicacionContrato: string | null;

  // Subrogación
  fechaAceptacionSubrogacion: string | null;
  fechaPresentacionSubrogacion: string | null;
  motivoNoSubrogacion: string | null;

  // Calificación
  calificacion: string | null;

  // Sentencia 1ra instancia
  sentenciaPrimeraInstanciaResultado: string | null;
  sentenciaPrimeraInstanciaFecha: string | null;

  // Medidas cautelares
  medidasCautelares: {
    id: number | null;
    fecha: string | null;
    tipoMedida: string | null;
    medidaEfectiva: string | null;
    sujetoNombre: string | null;
    tipoBien: string | null;
    direccion: string | null;
    area: number | null;
    avaluoJudicial: number | null;
    observaciones: string | null;
  } | null;

  // Última actuación
  ultimaActuacionFecha: string | null;
  ultimaActuacionTipo: string | null;
  ultimaActuacionObservacion: string | null;

  // Abogados
  abogadoPrincipal: string | null;
  abogadosInternos: any[];
}

@Injectable({
  providedIn: 'root',
})
export class RedelexService {
  // environment.apiUrl = "https://redelex-ayhxghaje6c3gkaz.eastus-01.azurewebsites.net/"
  private apiUrl = `${environment.apiUrl}api/redelex`;

  constructor(private http: HttpClient) {}

  /**
   * Detalle del proceso por ID
   * GET /api/redelex/proceso/:id
   * Respuesta: { success: boolean; data: ProcesoDetalleDto | null }
   */
  getProceso(id: number): Observable<{ success: boolean; data: ProcesoDetalleDto | null }> {
    return this.http.get<{ success: boolean; data: ProcesoDetalleDto | null }>(
      `${this.apiUrl}/proceso/${id}`
    );
  }

  /**
   * Lista de procesos por identificación
   * GET /api/redelex/procesos-por-identificacion/:identificacion
   * Respuesta: { success: boolean; identificacion: string; procesos: number[] }
   */
  getProcesosByIdentificacion(identificacion: string): Observable<ProcesosPorIdentificacionResponse> {
    return this.http.get<ProcesosPorIdentificacionResponse>(
      `${this.apiUrl}/procesos-por-identificacion/${identificacion}`
    );
  }
}
