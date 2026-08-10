import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Documento } from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class BibliotecaService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8000';

  /**
   * Lista todos los documentos activos en la biblioteca.
   */
  listarDocumentos(): Observable<Documento[]> {
    return this.http.get<any[]>(`${this.baseUrl}/biblioteca/documentos`).pipe(
      map(docs => docs.map(d => this.mapearDocumento(d)))
    );
  }

  /**
   * Lista todos los documentos en la papelera de reciclaje (Solo Administradores).
   */
  listarPapelera(): Observable<Documento[]> {
    return this.http.get<any[]>(`${this.baseUrl}/biblioteca/papelera`).pipe(
      map(docs => docs.map(d => this.mapearDocumento(d)))
    );
  }

  /**
   * Sube un archivo con su correspondiente metadata a la base de datos de biblioteca.
   */
  subirDocumento(file: File, categoria: string, banco: string | null, numeroAtm: string | null): Observable<Documento> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoria', categoria);
    
    if (banco) formData.append('banco', banco);
    if (numeroAtm) formData.append('numero_atm', numeroAtm);

    return this.http.post<any>(`${this.baseUrl}/biblioteca/upload`, formData).pipe(
      map(doc => this.mapearDocumento(doc))
    );
  }

  /**
   * Descarga un archivo binario nativo del servidor abriendo el flujo local de guardado.
   */
  descargarDocumento(doc: Documento): void {
    this.http.get(`${this.baseUrl}/biblioteca/download/${doc.id}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = doc.nombreOriginal; // Descarga bajo su nombre representativo real
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          alert('No se pudo descargar el archivo solicitado.');
        }
      });
  }

  /**
   * Envía un archivo a la papelera (Soft Delete).
   */
  moverAPapelera(id: number): Observable<Documento> {
    return this.http.patch<any>(`${this.baseUrl}/biblioteca/${id}/trash`, null).pipe(
      map(doc => this.mapearDocumento(doc))
    );
  }

  /**
   * Restaura un archivo de la papelera de reciclaje.
   */
  restaurarDePapelera(id: number): Observable<Documento> {
    return this.http.patch<any>(`${this.baseUrl}/biblioteca/${id}/restore`, null).pipe(
      map(doc => this.mapearDocumento(doc))
    );
  }

  /**
   * Helper reutilizable para mapear snake_case (API) a camelCase (Frontend)
   */
  private mapearDocumento(d: any): Documento {
    return {
      id: d.id,
      nombreOriginal: d.nombre_original,
      nombreSistema: d.nombre_sistema,
      pesoBytes: d.peso_bytes,
      mimetype: d.mimetype,
      categoria: d.categoria,
      banco: d.banco,
      numeroAtm: d.numero_atm,
      subidoPorId: d.subido_por_id,
      createdAt: d.created_at,
      deletedAt: d.deleted_at,
      deletedById: d.deleted_by_id
    };
  }
}