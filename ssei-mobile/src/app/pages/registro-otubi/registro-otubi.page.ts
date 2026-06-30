import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { OtAtmDetalle, OtContextService, OtFotoReporte } from '../../ot-context.service';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, addOutline, trashOutline, arrowForwardOutline, locationOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-registro-otubi',
  templateUrl: './registro-otubi.page.html',
  styleUrls: ['./registro-otubi.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
  ]
})
export class RegistroOTUBIPage {
  atms: OtAtmDetalle[] = [];
  indiceAtmActivo = 0;
  comuna = '';
  direccion = '';

  // Búsqueda de ubicación
  busquedaDireccion = '';
  sugerencias: NominatimResultado[] = [];
  mostrarSugerencias = false;
  buscandoGps = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private fotosMap = new Map<number, OtFotoReporte[]>();

  constructor(
    private readonly otContextService: OtContextService,
    private readonly router: Router,
  ) {
    addIcons({ cloudUploadOutline, addOutline, trashOutline, arrowForwardOutline, locationOutline });
  }

  get cliente(): string {
    return this.otContextService.cliente;
  }

  set cliente(value: string) {
    this.otContextService.setCliente(value);
  }

  get atmActivo(): OtAtmDetalle {
    return this.atms[this.indiceAtmActivo];
  }

  get fotosAtmActivo(): OtFotoReporte[] {
    return this.fotosMap.get(this.indiceAtmActivo) ?? [];
  }

  ionViewWillEnter(): void {
    const atmsGuardados = this.otContextService.getAtms();
    this.atms = atmsGuardados.length > 0 ? atmsGuardados : [this.crearAtm(1)];
    this.comuna = this.otContextService.comuna;
    this.direccion = this.otContextService.direccion;
    this.busquedaDireccion = this.direccion;
    this.refrescarTodasLasFotos();
  }

  ionViewWillLeave(): void {
    this.otContextService.comuna = this.comuna;
    this.otContextService.direccion = this.direccion;
    this.sincronizarAtms();
  }

  guardar(): void {
    this.otContextService.comuna = this.comuna;
    this.otContextService.direccion = this.direccion;
    this.sincronizarAtms();
    this.otContextService.guardarTrabajoActivo();
    this.router.navigate(['/dashboard']);
  }

  onClienteChange(): void {
    this.otContextService.setCliente(this.cliente);
  }

  agregarAtm(): void {
    this.atms.push(this.crearAtm(this.atms.length + 1));
    this.indiceAtmActivo = this.atms.length - 1;
    this.sincronizarAtms();
  }

  eliminarAtm(): void {
    if (this.atms.length === 1) {
      return;
    }
    this.atms.splice(this.indiceAtmActivo, 1);
    this.reenumerarAtms();
    this.indiceAtmActivo = Math.max(0, this.indiceAtmActivo - 1);
    this.sincronizarAtms();
    this.refrescarTodasLasFotos();
  }

  cambiarAtm(event: CustomEvent): void {
    const nuevoIndice = Number(event.detail.value);
    if (!Number.isNaN(nuevoIndice) && this.atms[nuevoIndice]) {
      this.indiceAtmActivo = nuevoIndice;
    }
  }

  sincronizarAtms(): void {
    this.otContextService.setAtms(this.atms);
  }

  async onSeleccionFotos(event: Event, indiceAtm: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const atm = this.atms[indiceAtm];

    if (!files || files.length === 0 || !atm?.numeroAtm.trim()) {
      return;
    }

    const fotosNuevas: OtFotoReporte[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        continue;
      }
      const dataUrl = await this.convertirArchivoADataUrl(file);
      fotosNuevas.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        atmNumero: atm.numeroAtm.trim(),
        nombreArchivo: file.name,
        mimeType: file.type,
        fechaRegistro: new Date().toISOString(),
        previewDataUrl: dataUrl,
      });
    }

    if (fotosNuevas.length > 0) {
      this.otContextService.agregarFotos(fotosNuevas);
      this.refrescarFotosAtm(indiceAtm);
    }

    input.value = '';
  }

  eliminarFoto(idFoto: string, indiceAtm: number): void {
    this.otContextService.eliminarFoto(idFoto);
    this.refrescarFotosAtm(indiceAtm);
  }

  private crearAtm(numero: number): OtAtmDetalle {
    return {
      etiqueta: `ATM ${numero}`,
      tipoServicio: 'instalacion',
      numeroAtm: '',
      serieCajero: '',
      serieMmbb: '',
      detallesServicio: '',
      observaciones: '',
    };
  }

  private reenumerarAtms(): void {
    this.atms = this.atms.map((atm, index) => ({
      ...atm,
      etiqueta: `ATM ${index + 1}`,
    }));
  }

  private refrescarTodasLasFotos(): void {
    this.fotosMap = new Map();
    this.atms.forEach((_, i) => this.refrescarFotosAtm(i));
  }

  private refrescarFotosAtm(indiceAtm: number): void {
    const atm = this.atms[indiceAtm];
    if (!atm?.numeroAtm.trim()) {
      this.fotosMap.set(indiceAtm, []);
      return;
    }
    this.fotosMap.set(indiceAtm, this.otContextService.getFotosPorAtm(atm.numeroAtm));
  }

  private convertirArchivoADataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.readAsDataURL(file);
    });
  }

  // -------------------------------------------------------------------------
  // GPS + búsqueda de dirección (Nominatim / OpenStreetMap)
  // -------------------------------------------------------------------------

  async obtenerUbicacionGps(): Promise<void> {
    this.buscandoGps = true;
    this.sugerencias = [];
    this.mostrarSugerencias = false;
    try {
      const permiso = await Geolocation.checkPermissions();
      if (permiso.location === 'denied') {
        await Geolocation.requestPermissions();
      }
      const pos = await Geolocation.getCurrentPosition({ timeout: 10000, enableHighAccuracy: true });
      await this.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      this.busquedaDireccion = this.direccion;
    } catch (err) {
      console.error('GPS no disponible:', err);
    } finally {
      this.buscandoGps = false;
    }
  }

  onBusquedaChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    const query = this.busquedaDireccion.trim();
    if (query.length < 3) {
      this.sugerencias = [];
      this.mostrarSugerencias = false;
      return;
    }
    this.debounceTimer = setTimeout(() => this.buscarNominatim(query), 400);
  }

  seleccionarSugerencia(s: NominatimResultado): void {
    const addr = s.address;
    const calle = addr.road ?? addr.pedestrian ?? '';
    const numero = addr.house_number ? ` ${addr.house_number}` : '';
    this.direccion = `${calle}${numero}`.trim() || s.display_name.split(',')[0].trim();
    this.busquedaDireccion = this.direccion;
    this.comuna = addr.suburb ?? addr.city_district ?? addr.quarter
      ?? addr.city ?? addr.town ?? addr.municipality ?? '';
    this.sugerencias = [];
    this.mostrarSugerencias = false;
  }

  cerrarSugerencias(): void {
    // Pequeño delay para que el click en una sugerencia se procese antes
    setTimeout(() => { this.mostrarSugerencias = false; }, 200);
  }

  private async buscarNominatim(query: string): Promise<void> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=cl&limit=5&accept-language=es`;
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      this.sugerencias = await res.json() as NominatimResultado[];
      this.mostrarSugerencias = this.sugerencias.length > 0;
    } catch {
      this.sugerencias = [];
      this.mostrarSugerencias = false;
    }
  }

  private async reverseGeocode(lat: number, lon: number): Promise<void> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=es`;
    const res = await fetch(url);
    const data = await res.json() as NominatimResultado;
    const addr = data.address;
    const calle = addr.road ?? addr.pedestrian ?? '';
    const numero = addr.house_number ? ` ${addr.house_number}` : '';
    this.direccion = `${calle}${numero}`.trim() || data.display_name.split(',')[0].trim();
    this.comuna = addr.suburb ?? addr.city_district ?? addr.quarter
      ?? addr.city ?? addr.town ?? addr.municipality ?? '';
  }
}

// ---------------------------------------------------------------------------
// Tipos Nominatim
// ---------------------------------------------------------------------------
interface NominatimResultado {
  place_id: number;
  display_name: string;
  address: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    suburb?: string;
    city_district?: string;
    quarter?: string;
    city?: string;
    town?: string;
    municipality?: string;
    state?: string;
  };
}
