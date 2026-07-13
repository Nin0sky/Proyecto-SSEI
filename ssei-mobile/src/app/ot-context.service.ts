import { Injectable } from '@angular/core';

export interface OtAtmDetalle {
  etiqueta: string;
  tipoServicio: string;
  numeroAtm: string;
  serieCajero: string;
  serieMmbb: string;
  detallesServicio: string;
  observaciones: string;
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
  private readonly storageKey = 'ssei-ot-context';

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
    if (this.trabajos.length === 0) {
      this.seedDatosDemostracion();
    }
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
    this.guardar();
    this.ubicacion = '';
  }

  cargarTrabajo(id: string): void {
    const trabajo = this.trabajos.find(t => t.id === id);
    if (!trabajo) {
      return;
    }
    this.trabajoActivoId = id;
    this.cliente = trabajo.cliente;
    this.atms = trabajo.atms.map(a => ({ ...a }));
    this.fotos = trabajo.fotos.map(f => ({ ...f }));
    this.comuna = trabajo.comuna;
    this.direccion = trabajo.direccion;
    this.nombreTecnico = trabajo.nombreTecnico ?? '';
    this.nombreETV = trabajo.nombreETV ?? '';
    this.nombreAlarma = trabajo.nombreAlarma ?? '';
    this.guardar();
    this.ubicacion = trabajo.ubicacion ?? '';
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

  private seedDatosDemostracion(): void {
    const atm = (numero: string, etiqueta = 'ATM 1'): OtAtmDetalle => ({
      etiqueta,
      tipoServicio: 'instalacion',
      numeroAtm: numero,
      serieCajero: '',
      serieMmbb: '',
      detallesServicio: '',
      observaciones: '',
    });
    this.trabajos = [
      { id: '1024', cliente: 'Banco de Chile', atms: [atm('6122')], fotos: [], estado: 'asignado', fechaCreacion: new Date().toISOString(), comuna: 'Santiago Centro', direccion: '', ubicacion: '', origenServidor: true },
      { id: '1025', cliente: 'Banco Estado', atms: [atm('8841')], fotos: [], estado: 'sincronizado', fechaCreacion: new Date().toISOString(), comuna: 'Las Condes', direccion: '', ubicacion: '', origenServidor: true },
    ];
    this.guardar();
  }

  private cargar(): void {
    const raw = localStorage.getItem(this.storageKey);

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
    } catch {
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
    }
  }

  private guardar(): void {
    localStorage.setItem(
      this.storageKey,
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
