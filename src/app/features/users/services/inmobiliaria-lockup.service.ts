import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.prod';

export interface InmobiliariaLookup {
  _id: string;
  nombreInmobiliaria: string;
  nit: string;
  codigo: string;
  emailRegistrado?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InmobiliariaLookupService {
  private apiUrl = `${environment.apiUrl}api/inmobiliarias`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<InmobiliariaLookup[]> {
    return this.http.get<InmobiliariaLookup[]>(this.apiUrl);
  }
}