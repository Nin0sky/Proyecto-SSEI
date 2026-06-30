import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OtTrabajo, OtCreate, OtEstado } from '../models/ot.model';

@Injectable({ providedIn: 'root' })
export class OtService {
  private readonly base = 'http://localhost:8000';
  private http = inject(HttpClient);

  listar(estado?: OtEstado): Observable<OtTrabajo[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<OtTrabajo[]>(`${this.base}/ots`, { params });
  }

  obtener(id: number): Observable<OtTrabajo> {
    return this.http.get<OtTrabajo>(`${this.base}/ots/${id}`);
  }

  crear(ot: OtCreate): Observable<OtTrabajo> {
    return this.http.post<OtTrabajo>(`${this.base}/ots`, ot);
  }

  actualizar(id: number, ot: Partial<OtCreate>): Observable<OtTrabajo> {
    return this.http.put<OtTrabajo>(`${this.base}/ots/${id}`, ot);
  }

  cambiarEstado(id: number, estado: OtEstado): Observable<OtTrabajo> {
    return this.http.patch<OtTrabajo>(`${this.base}/ots/${id}/estado`, { estado });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/ots/${id}`);
  }
}
