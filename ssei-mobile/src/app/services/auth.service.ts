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
        // CORRECCIÓN: Usar res.user.full_name en vez de res.user.fullName para coincidir con la API
        localStorage.setItem('tecnico_nombre', res.user.full_name); 
      })
    );
  }

  obtenerOtsServidor(): Observable<any[]> {
    const token = this.obtenerTokenValue();
    const tecnicoId = this.obtenerTecnicoId(); 

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const url = tecnicoId ? `${this.baseUrl}/ots?tecnico_id=${tecnicoId}` : `${this.baseUrl}/ots`;
    return this.http.get<any[]>(url, { headers });
  }

    obternerOtsServidorSilenciado(): Observable<any[]> {
    const token = this.obtenerTokenValue();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    // Devuelve el observable de la petición limpia para el control del suscriptor en el dashboard
    return this.http.get<any[]>(`${this.baseUrl}/ots`, { headers });
  }

  obtenerTokenValue(): string | null {
    return localStorage.getItem('token');
  }

  obtenerTecnicoId(): string | null {
    return localStorage.getItem('tecnico_id');
  }
}