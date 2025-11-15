import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RedelexService {
  private apiUrl = 'https://redelex-ayhxghaje6c3gkaz.eastus-01.azurewebsites.net/api/redelex';

  constructor(private http: HttpClient) {}

  getProceso(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/proceso/${id}`);
  }

  getProcesosByIdentificacion(identificacion: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/procesos-por-identificacion/${identificacion}`);
  }

}
