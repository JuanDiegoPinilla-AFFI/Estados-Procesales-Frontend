import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RedelexService {
  private apiUrl = 'http://localhost:4000/api/redelex';

  constructor(private http: HttpClient) {}

  getProceso(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/proceso/${id}`);
  }

  getProcesosByIdentificacion(identificacion: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/procesos-por-identificacion/${identificacion}`);
  }

}
