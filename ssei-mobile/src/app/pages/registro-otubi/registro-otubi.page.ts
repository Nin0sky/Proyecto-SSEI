import { Component, inject } from '@angular/core';
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
  IonButtons,
} from '@ionic/angular/standalone';
import { OtAtmDetalle, OtContextService, OtFotoReporte } from '../../ot-context.service';
import { AuthService } from '../../services/auth.service'; // 👈 Inyectado
import { addIcons } from 'ionicons';
import { cloudUploadOutline, addOutline, trashOutline, arrowForwardOutline, locationOutline, logOutOutline, arrowBackOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';

interface NominatimResultado {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    suburb?: string;
    county?: string;
  };
}

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
    IonButtons,
  ]
})
export class RegistroOTUBIPage {
  atms: OtAtmDetalle[] = [];
  indiceAtmActivo = 0;
  comuna = '';
  direccion = '';
  ubicacion = '';

  // Búsqueda de ubicación
  busquedaDireccion = '';
  sugerencias: NominatimResultado[] = [];
  mostrarSugerencias = false;
  buscandoGps = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private fotosMap = new Map<number, OtFotoReporte[]>();

  // Inyectamos AuthService y dependencias nativas
  private readonly authService = inject(AuthService);

  constructor(
    private readonly otContextService: OtContextService,
    private readonly router: Router,
  ) {
    addIcons({ cloudUploadOutline, addOutline, trashOutline, arrowForwardOutline, locationOutline, logOutOutline, arrowBackOutline });
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
    this.ubicacion = this.otContextService.ubicacion;

    if (this.atms.length > 0 && !this.atms[0].numeroAtm && atmsGuardados[0]?.numeroAtm) {
      this.atms[0].numeroAtm = atmsGuardados[0].numeroAtm;
    }

    this.refrescarTodasLasFotos();
  }

  ionViewWillLeave(): void {
    const direccionFinal = this.direccion.trim() || this.busquedaDireccion.trim();
    this.direccion = direccionFinal;
    this.otContextService.direccion = direccionFinal;
    this.otContextService.comuna = this.comuna;
    this.otContextService.ubicacion = this.ubicacion;
  }

  cerrarSesionTecnico(): void {
    this.authService.presentarConfirmacionLogout();
  }

  onClienteChange(): void {
    this.otContextService.setCliente(this.cliente);
  }

  onUbicacionBlur(): void {
    this.otContextService.ubicacion = this.ubicacion;
    this.otContextService.guardarTrabajoActivo();
  }

  sincronizarAtms(): void {
    this.otContextService.setAtms(this.atms);
    this.otContextService.guardarTrabajoActivo();
  }

  crearAtm(indice: number): OtAtmDetalle {
    return {
      etiqueta: `ATM ${indice}`,
      tipoServicio: 'instalacion',
      numeroAtm: '',
      serieCajero: '',
      serieMmbb: '',
      detallesServicio: '',
      observaciones: '',
    };
  }

  agregarAtm(): void {
    const nuevoIndice = this.atms.length + 1;
    this.atms.push(this.crearAtm(nuevoIndice));
    this.indiceAtmActivo = this.atms.length - 1;
    this.sincronizarAtms();
  }

  eliminarAtm(): void {
    if (this.atms.length <= 1) return;
    this.atms.splice(this.indiceAtmActivo, 1);
    this.atms.forEach((atm, index) => {
      atm.etiqueta = `ATM ${index + 1}`;
    });
    this.indiceAtmActivo = Math.max(0, this.indiceAtmActivo - 1);
    this.sincronizarAtms();
  }

  cambiarAtm(event: any): void {
    this.indiceAtmActivo = parseInt(event.detail.value, 10);
  }

  refrescarTodasLasFotos(): void {
    this.fotosMap.clear();
    this.atms.forEach((atm, index) => {
      const fotosAtm = this.otContextService.getFotosPorAtm(atm.numeroAtm);
      this.fotosMap.set(index, fotosAtm);
    });
  }

  onSeleccionFotos(event: any, atmIndice: number): void {
    const files = event.target.files as FileList;
    if (!files || files.length === 0) return;

    const atmNumero = this.atms[atmIndice].numeroAtm.trim();
    if (!atmNumero) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64 = e.target.result as string;
        const foto: OtFotoReporte = {
          id: `${Date.now()}-${Math.random()}`,
          atmNumero,
          nombreArchivo: file.name,
          mimeType: file.type,
          fechaRegistro: new Date().toISOString(),
          previewDataUrl: base64,
        };
        this.otContextService.agregarFotos([foto]);
        this.refrescarTodasLasFotos();
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarFoto(idFoto: string, atmIndice: number): void {
    this.otContextService.eliminarFoto(idFoto);
    this.refrescarTodasLasFotos();
  }

  guardar(): void {
    this.otContextService.comuna = this.comuna;
    this.otContextService.direccion = this.direccion;
    this.otContextService.ubicacion = this.ubicacion;
    this.otContextService.setAtms(this.atms);
    this.otContextService.guardarTrabajoActivo();
  }

  async obtenerUbicacionGps(): Promise<void> {
    this.buscandoGps = true;
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SSEI-Mobile-App' } });
      const data = await res.json();

      if (data) {
        const address = data.address;
        const calle = address.road || address.pedestrian || '';
        const numero = address.house_number || '';
        this.comuna = address.city || address.town || address.suburb || address.county || '';
        this.direccion = `${calle} ${numero}`.trim();
        this.busquedaDireccion = this.direccion;

        this.otContextService.comuna = this.comuna;
        this.otContextService.direccion = this.direccion;
        this.otContextService.guardarTrabajoActivo();
      }
    } catch (e) {
      console.error('Error de Geolocalización:', e);
    } finally {
      this.buscandoGps = false;
    }
  }

  onBusquedaChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const text = this.busquedaDireccion.trim();
    if (text.length < 4) {
      this.sugerencias = [];
      this.mostrarSugerencias = false;
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&addressdetails=1&countrycodes=cl`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SSEI-Mobile-App' } });
        const list = await res.json() as NominatimResultado[];
        this.sugerencias = list || [];
        this.mostrarSugerencias = this.sugerencias.length > 0;
      } catch (e) {
        console.error('Error de autocompletado:', e);
      }
    }, 600);
  }

  seleccionarSugerencia(s: NominatimResultado): void {
    const isRoad = s.address && s.address.road;
    const calle = s.address.road || '';
    const numero = s.address.house_number || '';
    this.comuna = s.address.city || s.address.town || s.address.suburb || s.address.county || '';
    this.direccion = isRoad ? `${calle} ${numero}`.trim() : s.display_name;
    this.busquedaDireccion = this.direccion;
    this.mostrarSugerencias = false;
    this.sugerencias = [];

    this.otContextService.comuna = this.comuna;
    this.otContextService.direccion = this.direccion;
    this.otContextService.guardarTrabajoActivo();
  }

  cerrarSugerencias(): void {
    setTimeout(() => {
      this.mostrarSugerencias = false;
    }, 280);
  }
}