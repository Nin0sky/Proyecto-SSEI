import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { TokenResponse, Usuario } from '../models/user.model';
import { environment } from '../../../environments/environment'; // O usar la url estática si no está configurada aún
// Elimina esta línea si no vas a configurar environments aún:
//import { environment } from '../../../environments/environment'; // O usar la url estática si no está configurada aún

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  // URL base consumida de la configuración de Angular
  private readonly baseUrl = 'http://localhost:8000'; // Puedes reemplazar por tu variable de entorno

  // Signals reactivos para el estado de autenticación (Angular 16+)
  private usuarioSignal = signal<Usuario | null>(this.obtenerSesionGuardada());
  private tokenSignal = signal<string | null>(localStorage.getItem('ssei_auth_token'));

  // Selectores reactivos listos para usar en tus plantillas HTML
  public readonly currentUser = computed(() => this.usuarioSignal());
  public readonly isAuthenticated = computed(() => !!this.tokenSignal());
  public readonly currentUserRole = computed(() => this.usuarioSignal()?.role ?? null);

  /**
   * Realiza la solicitud de login contra la API FastAPI del Backend.
   * Realiza la traducción transparente de snake_case (API) a camelCase (Frontend).
   */
  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      map(response => {
        // Mapeamos el payload del backend (snake_case) al tipado del frontend (camelCase)
        const usuarioMapeado: Usuario = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.full_name, // Mapeo explícito
          role: response.user.role,
          isActive: response.user.is_active, // Mapeo explícito
          createdAt: response.user.created_at // Mapeo explícito
        };

        const tokenResponse: TokenResponse = {
          accessToken: response.access_token, // Mapeo explícito
          tokenType: response.token_type,     // Mapeo explícito
          user: usuarioMapeado
        };

        return tokenResponse;
      }),
      tap(authData => {
        // Almacenamos la sesión en el navegador
        this.guardarSesion(authData.accessToken, authData.user);
      })
    );
  }
  obtenerOtsServidor(): Observable<any[]> {
    const token = localStorage.getItem('ssei_auth_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any[]>(`${this.baseUrl}/ots`, { headers });
  }

  /**
   * Cierra la sesión limpiando el almacenamiento y notificando reactivamente al sistema.
   */
  logout(): void {
    localStorage.removeItem('ssei_auth_token');
    localStorage.removeItem('ssei_auth_user');
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
  }

  /**
   * Comprueba si el usuario tiene un rol determinado en el sistema (utilizado por guards y componentes).
   */
  hasRole(rolesPermitidos: string[]): boolean {
    const rolActual = this.currentUserRole();
    return rolActual ? rolesPermitidos.includes(rolActual) : false;
  }

  /**
   * Helper privado para persistir datos JWT locales.
   */
  private guardarSesion(token: string, usuario: Usuario): void {
    localStorage.setItem('ssei_auth_token', token);
    localStorage.setItem('ssei_auth_user', JSON.stringify(usuario));
    this.tokenSignal.set(token);
    this.usuarioSignal.set(usuario);
  }

  /**
   * Recupera la información del usuario del almacenamiento persistente en el arranque inicial.
   */
  private obtenerSesionGuardada(): Usuario | null {
    const rawUser = localStorage.getItem('ssei_auth_user');
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as Usuario;
    } catch {
      return null;
    }
  }

  /**
   * Método de conveniencia para recuperar el token en interceptores no reactivos.
   */
  getToken(): string | null {
    return this.tokenSignal();
  }
}