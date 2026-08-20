import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry, timer, Observable } from 'rxjs';

export interface MedicionElectrica {
  faseNeutro: string;
  neutroTierra: string;
  faseTierra: string;
}

export interface MedicionesElectricas {
  tablero: MedicionElectrica;
  upsAntigua: MedicionElectrica;
  upsNueva: MedicionElectrica;
  tieneUpsNueva: boolean;
}

export interface OtAtmDetalle {
  etiqueta: string;
  tipoServicio: string;
  numeroAtm: string;
  serieCajero: string;
  serieMmbb: string;
  detallesServicio: string;
  observaciones: string;
  medicionesElectricas?: MedicionesElectricas;
}

export interface OtFotoReporte {
  id: string;
  atmNumero: string;
  nombreArchivo: string;
  mimeType: string;
  fechaRegistro: string;
  previewDataUrl: string;
}

export type OtEstado = 'asignado' | 'en_progreso' | 'pendiente_envio' | 'sincronizado';

export interface OtTrabajo {
  id: string;
  cliente: string;
  atms: OtAtmDetalle[];
  fotos: OtFotoReporte[];
  estado: OtEstado;
  fechaCreacion: string;
  comuna: string;
  direccion: string;
  origenServidor: boolean;
  nombreTecnico?: string;
  nombreETV?: string;
  nombreAlarma?: string;
  ubicacion: string;
}

@Injectable({
  providedIn: 'root',
})
export class OtContextService {
  private http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:8000'; // Usa tu IP local en producción

  // Estado activo del trabajo en edición
  cliente = '';
  atms: OtAtmDetalle[] = [];
  fotos: OtFotoReporte[] = [];
  comuna = '';
  direccion = '';
  nombreTecnico = '';
  nombreETV = '';
  nombreAlarma = '';
  ubicacion = '';

  // Lista de todos los trabajos y referencia al activo
  trabajos: OtTrabajo[] = [];
  trabajoActivoId: string | null = null;

  constructor() {
    this.cargar();
  }

  /**
   * Genera de forma dinámica la clave de almacenamiento exclusiva para el técnico autenticado.
   */
  private getStorageKey(): string {
    const tecnicoId = localStorage.getItem('tecnico_id') || 'invitado';
    return `ssei-ot-context-${tecnicoId}`;
  }

  sincronizarOTServidor(idTrabajo: string, zipBlob: Blob, nombreArchivoZip: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', zipBlob, nombreArchivoZip);
    formData.append('categoria', 'respaldo_terreno');
    // Enviar el archivo ZIP a la biblioteca en Backend
    return this.http.post(`${this.apiBase}/biblioteca/upload`, formData).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.warn(`Intento de reenvío número ${retryCount} por caída de señal...`);
          return timer(retryCount * 2000); // Backoff exponencial: 2s, 4s, 6s...
        }
      })
    );
  }

  // --- Estado activo ---

  setCliente(cliente: string): void {
    this.cliente = cliente;
    this.guardar();
  }

  setAtms(atms: OtAtmDetalle[]): void {
    this.atms = atms.map((atm, index) => ({
      ...atm,
      etiqueta: `ATM ${index + 1}`,
    }));
    this.guardar();
  }

  getAtms(): OtAtmDetalle[] {
    return this.atms.map((atm) => ({ ...atm }));
  }

  agregarFotos(fotosNuevas: OtFotoReporte[]): void {
    this.fotos = [...this.fotos, ...fotosNuevas];
    this.guardar();
  }

  getFotosPorAtm(atmNumero: string): OtFotoReporte[] {
    const atmNormalizado = atmNumero.trim();
    return this.fotos
      .filter((foto) => foto.atmNumero === atmNormalizado)
      .map((foto) => ({ ...foto }));
  }

  eliminarFoto(idFoto: string): void {
    this.fotos = this.fotos.filter((foto) => foto.id !== idFoto);
    this.guardar();
  }

  // --- Gestión de trabajos ---

  getTrabatos(): OtTrabajo[] {
    return this.trabajos.map(t => ({ ...t, atms: [...t.atms], fotos: [...t.fotos] }));
  }

  crearTrabajo(): void {
    const nuevoId = `local-${Date.now()}`;
    this.trabajos.push({
      id: nuevoId,
      cliente: '',
      atms: [],
      fotos: [],
      estado: 'en_progreso',
      fechaCreacion: new Date().toISOString(),
      comuna: '',
      direccion: '',
      origenServidor: false,
      nombreTecnico: '',
      nombreETV: '',
      nombreAlarma: '',
      ubicacion: '',
    });
    this.cliente = '';
    this.atms = [];
    this.fotos = [];
    this.comuna = '';
    this.direccion = '';
    this.nombreTecnico = '';
    this.nombreETV = '';
    this.nombreAlarma = '';
    this.trabajoActivoId = nuevoId;
    this.ubicacion = '';
    this.guardar();
  }

  cargarTrabajo(id: string): void {
    const trabajo = this.trabajos.find(t => t.id === id);
    if (!trabajo) {
      return;
    }
    this.trabajoActivoId = id;
    this.cliente = trabajo.cliente;
    this.comuna = trabajo.comuna;
    this.direccion = trabajo.direccion;
    this.nombreTecnico = trabajo.nombreTecnico ?? '';
    this.nombreETV = trabajo.nombreETV ?? '';
    this.nombreAlarma = trabajo.nombreAlarma ?? '';
    this.ubicacion = trabajo.ubicacion || (trabajo.atms && trabajo.atms[0]?.observaciones) || '';

    // Al cargar los ATMs de un trabajo real, instanciamos vacías sus mediciones si no existen
    this.atms = trabajo.atms.map((a, index) => {
      const tipoNormalizado = (a.tipoServicio ?? '').toString().trim().toLowerCase().replace(/\s+/g, '');

      return {
        ...a,
        tipoServicio: tipoNormalizado, // Asegura compatibilidad de tipo
        numeroAtm: a.numeroAtm || '',
        medicionesElectricas: a.medicionesElectricas ?? {
          tablero: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
          upsAntigua: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
          upsNueva: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
          tieneUpsNueva: false,
        }
      };
    });

    // Si la OT no tiene ATMs inicializados creamos uno precargado por defecto
    if (this.atms.length === 0) {
      this.atms = [
        {
          etiqueta: 'ATM 1',
          tipoServicio: 'instalacion',
          numeroAtm: '',
          serieCajero: '',
          serieMmbb: '',
          detallesServicio: '',
          observaciones: this.ubicacion,
        }
      ];
    }

    this.fotos = trabajo.fotos ? trabajo.fotos.map(f => ({ ...f })) : [];
    this.guardar();
  }

  guardarTrabajoActivo(): void {
    if (!this.trabajoActivoId) {
      return;
    }
    const idx = this.trabajos.findIndex(t => t.id === this.trabajoActivoId);
    if (idx === -1) {
      return;
    }
    this.trabajos[idx] = {
      ...this.trabajos[idx],
      cliente: this.cliente,
      atms: this.atms.map(a => ({ ...a })),
      fotos: this.fotos.map(f => ({ ...f })),
      comuna: this.comuna,
      direccion: this.direccion,
      nombreTecnico: this.nombreTecnico,
      nombreETV: this.nombreETV,
      nombreAlarma: this.nombreAlarma,
      estado: 'pendiente_envio',
      ubicacion: this.ubicacion,
    };
    this.guardar();
  }

  /**
   * Carga de datos aislada utilizando la clave dinámica del técnico autenticado.
   */
  cargar(): void {
    const key = this.getStorageKey();
    const raw = localStorage.getItem(key);

    // Reiniciar variables limpiamente para cambio de técnico libre de residuos
    this.cliente = '';
    this.atms = [];
    this.fotos = [];
    this.trabajos = [];
    this.trabajoActivoId = null;
    this.comuna = '';
    this.direccion = '';
    this.nombreTecnico = '';
    this.nombreETV = '';
    this.nombreAlarma = '';
    this.ubicacion = '';

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        cliente?: string;
        atms?: OtAtmDetalle[];
        fotos?: OtFotoReporte[];
        trabajos?: OtTrabajo[];
        trabajoActivoId?: string | null;
        comuna?: string;
        direccion?: string;
        nombreTecnico?: string;
        nombreETV?: string;
        nombreAlarma?: string;
        ubicacion?: string;
      };
      this.cliente = parsed.cliente ?? '';
      this.atms = Array.isArray(parsed.atms) ? parsed.atms : [];
      this.fotos = Array.isArray(parsed.fotos) ? parsed.fotos : [];
      this.trabajos = Array.isArray(parsed.trabajos) ? parsed.trabajos : [];
      this.trabajoActivoId = parsed.trabajoActivoId ?? null;
      this.comuna = parsed.comuna ?? '';
      this.direccion = parsed.direccion ?? '';
      this.nombreTecnico = parsed.nombreTecnico ?? '';
      this.nombreETV = parsed.nombreETV ?? '';
      this.nombreAlarma = parsed.nombreAlarma ?? '';
      this.ubicacion = parsed.ubicacion ?? '';
    } catch (e) {
      console.error('Error al parsear el almacenamiento del contexto:', e);
    }
  }

  /**
   * Persiste la información en localStorage con la clave aislada.
   */
  guardar(): void {
    const key = this.getStorageKey();
    localStorage.setItem(
      key,
      JSON.stringify({
        cliente: this.cliente,
        atms: this.atms,
        fotos: this.fotos,
        trabajos: this.trabajos,
        trabajoActivoId: this.trabajoActivoId,
        comuna: this.comuna,
        direccion: this.direccion,
        nombreTecnico: this.nombreTecnico,
        nombreETV: this.nombreETV,
        nombreAlarma: this.nombreAlarma,
        ubicacion: this.ubicacion,
      })
    );
  }
}