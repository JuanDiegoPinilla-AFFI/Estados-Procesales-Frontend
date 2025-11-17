import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  demandadoNombre: string | null;
  demandadoIdentificacion: string | null;

  despacho: string | null;
  despachoOrigen: string | null;

  fechaAdmisionDemanda: string | null;
  fechaCreacion: string | null;
  fechaEntregaAbogado: string | null;
  fechaRecepcionProceso: string | null;

  ubicacionContrato: string | null;

  fechaAceptacionSubrogacion: string | null;
  fechaPresentacionSubrogacion: string | null;
  motivoNoSubrogacion: string | null;

  calificacion: string | null;

  sentenciaPrimeraInstanciaResultado: string | null;
  sentenciaPrimeraInstanciaFecha: string | null;

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

  ultimaActuacionFecha: string | null;
  ultimaActuacionTipo: string | null;
  ultimaActuacionObservacion: string | null;

  abogadoPrincipal: string | null;
  abogadosInternos: any[];
}

@Injectable({
  providedIn: 'root'
})
export class RedelexService {
  private apiUrl =
    'http://localhost:4000/api/redelex';

  constructor(private http: HttpClient) {}

  getProceso(id: number): Observable<{ success: boolean; data: ProcesoDetalleDto }> {
    return this.http.get<{ success: boolean; data: ProcesoDetalleDto }>(
      `${this.apiUrl}/proceso/${id}`
    );
  }

  getProcesosByIdentificacion(
    identificacion: string
  ): Observable<{ success: boolean; identificacion: string; procesos: number[] }> {
    return this.http.get<{ success: boolean; identificacion: string; procesos: number[] }>(
      `${this.apiUrl}/procesos-por-identificacion/${identificacion}`
    );
  }
}
