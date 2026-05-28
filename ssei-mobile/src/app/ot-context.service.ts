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

@Injectable({
  providedIn: 'root',
})
export class OtContextService {
  private readonly storageKey = 'ssei-ot-context';

  cliente = '';
  atms: OtAtmDetalle[] = [];
  fotos: OtFotoReporte[] = [];

  constructor() {
    this.cargar();
  }

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
      };
      this.cliente = parsed.cliente ?? '';
      this.atms = Array.isArray(parsed.atms) ? parsed.atms : [];
      this.fotos = Array.isArray(parsed.fotos) ? parsed.fotos : [];
    } catch {
      this.cliente = '';
      this.atms = [];
      this.fotos = [];
    }
  }

  private guardar(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        cliente: this.cliente,
        atms: this.atms,
        fotos: this.fotos,
      })
    );
  }
}
