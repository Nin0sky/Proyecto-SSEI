import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

} from '@ionic/angular/standalone';
import { OtAtmDetalle, OtContextService, OtFotoReporte } from '../../ot-context.service';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, addOutline, trashOutline, arrowForwardOutline } from 'ionicons/icons';

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
  ]
})
export class RegistroOTUBIPage {
  atms: OtAtmDetalle[] = [];
  indiceAtmActivo = 0;
  comuna = '';
  direccion = '';

  private fotosMap = new Map<number, OtFotoReporte[]>();

  constructor(private readonly otContextService: OtContextService) {
    addIcons({ cloudUploadOutline, addOutline, trashOutline, arrowForwardOutline });
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
    this.refrescarTodasLasFotos();
  }

  ionViewWillLeave(): void {
    this.sincronizarAtms();
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
}
