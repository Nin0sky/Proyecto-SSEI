import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Usuario } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  
  // URL base consumida de la API local de FastAPI
  private readonly baseUrl = 'http://localhost:8000';

  /**
   * Obtiene la lista completa de usuarios registrados en el backend.
   * Traduce las propiedades de snake_case a camelCase de manera automática.
   */
  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/users`).pipe(
      map(usuariosSnake => 
        usuariosSnake.map(user => ({
          id: user.id,
          email: user.email,
          fullName: user.full_name, // Mapeo explícito
          role: user.role,
          isActive: user.is_active, // Mapeo explícito
          createdAt: user.created_at // Mapeo explícito
        }))
      )
    );
  }

  /**
   * Registra un nuevo usuario en la base de datos con un rol y contraseña inicial.
   * Envía los datos con formato correcto hacia el backend y mapea la respuesta resultante.
   */
  crearUsuario(usuarioNuevo: any): Observable<Usuario> {
    // Estructuramos el payload que espera el backend en snake_case
    const payload = {
      email: usuarioNuevo.email,
      password: usuarioNuevo.password,
      full_name: usuarioNuevo.fullName, // Mapeo explícito a la API
      role: usuarioNuevo.role,
      is_active: usuarioNuevo.isActive !== undefined ? usuarioNuevo.isActive : true // Mapeo explícito
    };

    return this.http.post<any>(`${this.baseUrl}/admin/users`, payload).pipe(
      map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name, // Mapeo explícito
        role: user.role,
        isActive: user.is_active, // Mapeo explícito
        createdAt: user.created_at // Mapeo explícito
      }))
    );
  }

    /**
   * Borra físicamente una cuenta de usuario del servidor SQL.
   */
  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/users/${id}`);
  }

  /**
   * Alterna el estado de activación de un usuario (Borrado Lógico).
   */
  cambiarEstadoActivo(id: number, activo: boolean): Observable<Usuario> {
    return this.http.patch<any>(`${this.baseUrl}/admin/users/${id}/status`, null, {
      params: { is_active: activo }
    }).pipe(
      map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      }))
    );
  }
}