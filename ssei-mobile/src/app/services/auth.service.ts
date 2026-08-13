import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  login(email: string, password_plana: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, {
      email: email,
      password: password_plana
    }).pipe(
      tap((res: any) => {
        // Almacenamos de manera segura el Token JWT y datos del técnico
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('tecnico_id', res.user.id);
        localStorage.setItem('tecnico_nombre', res.user.fullName);
      })
    );
  }

  obtenerOtsServidor(): Observable<any[]> {
    const token = this.obtenerTokenValue();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any[]>(`${this.baseUrl}/ots`, { headers });
  }

  obtenerTokenValue(): string | null {
    return localStorage.getItem('token');
  }

  obtenerTecnicoId(): string | null {
    return localStorage.getItem('tecnico_id');
  }
}