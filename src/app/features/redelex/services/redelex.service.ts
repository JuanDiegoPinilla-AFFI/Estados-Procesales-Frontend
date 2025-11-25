import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

  sujetos: SujetosDto[];

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
  medidasCautelares: MedidasDto[];

  // Última actuación
  ultimaActuacionFecha: string | null;
  ultimaActuacionTipo: string | null;
  ultimaActuacionObservacion: string | null;

  abogados: AbogadoDto[];
}

export interface MedidasDto {
    tipoBien: string | null;
    sujeto: string | null;
    tipoMedida: string | null;
    medidaEfectiva: string | null;
    avaluoJudicial: number | null;
    observaciones: string | null;
}

export interface AbogadoDto {
  ActuaComo: string;
  Nombre: string;
}

export interface SujetosDto {
  Tipo: string;
  Nombre: string;
  TipoIdentificacion: string;
  NumeroIdentificacion: string;
}

// Interfaz para tipar la respuesta (mismo DTO del backend)
export interface InformeInmobiliaria {
  idProceso: number;
  claseProceso: string;
  demandadoIdentificacion: string;
  demandadoNombre: string;
  demandanteIdentificacion: string;
  demandanteNombre: string;
  codigoAlterno: string;
  etapaProcesal: string;
  fechaRecepcionProceso: string;
  sentenciaPrimeraInstancia: string;
  despacho: string;
  numeroRadicacion: string;
  ciudadInmueble: string | null;
}

export interface InformeResponse {
  success: boolean;
  count: number;
  data: InformeInmobiliaria[];
}


@Injectable({
  providedIn: 'root',
})
export class RedelexService {
  // environment.apiUrl = "https://api.estadosprocesales.affi.net/"
  private apiUrl = `${environment.apiUrl}api/redelex`;

  constructor(private http: HttpClient) {}

  // --- NUEVO MÉTODO ---
  getMisProcesos(): Observable<any> {
    // Llama al endpoint "inteligente" que usa el NIT del token
    return this.http.get(`${this.apiUrl}mis-procesos`);
  }

  getProcesoDetalleById(id: number): Observable<any> {
    // Llama al endpoint GET /api/redelex/proceso/:id
    return this.http.get(`${this.apiUrl}proceso/${id}`);
  }

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

  /**
  * Obtiene el informe de Inmobiliar por ID
  * @param informeId ID del informe (ej: 5626)
  */
  getInformeInmobiliaria(informeId: number): Observable<InformeResponse> {
    return this.http.get<InformeResponse>(`${this.apiUrl}/informe-inmobiliaria/${informeId}`);
  }
}
