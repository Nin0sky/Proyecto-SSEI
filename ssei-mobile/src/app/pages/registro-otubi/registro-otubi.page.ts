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
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { OtContextService, OtFotoReporte } from '../../ot-context.service';
import { addIcons } from 'ionicons';
import { cloudUploadOutline } from 'ionicons/icons'
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
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon
  ]
})
export class RegistroOTUBIPage {
  atmOptions: string[] = [];
  atmId = '';
  comuna = '—';
  direccion = '—';
  fotosAtmActual: OtFotoReporte[] = [];

  constructor(private readonly otContextService: OtContextService) {
    addIcons({ cloudUploadOutline });
  }

  get cliente(): string {
    return this.otContextService.cliente;
  }

  set cliente(value: string) {
    this.otContextService.setCliente(value);
  }

  ionViewWillEnter(): void {
    this.actualizarAtmsDesdeFormulario();
    this.refrescarFotosAtmActual();
  }

  onClienteChange(): void {
    this.otContextService.setCliente(this.cliente);
  }

  onAtmChange(): void {
    this.actualizarUbicacion();
    this.refrescarFotosAtmActual();
  }

  async onSeleccionFotos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0 || !this.atmId) {
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
        atmNumero: this.atmId.trim(),
        nombreArchivo: file.name,
        mimeType: file.type,
        fechaRegistro: new Date().toISOString(),
        previewDataUrl: dataUrl,
      });
    }

    if (fotosNuevas.length > 0) {
      this.otContextService.agregarFotos(fotosNuevas);
      this.refrescarFotosAtmActual();
    }

    input.value = '';
  }

  eliminarFoto(idFoto: string): void {
    this.otContextService.eliminarFoto(idFoto);
    this.refrescarFotosAtmActual();
  }

  private actualizarAtmsDesdeFormulario(): void {
    this.atmOptions = this.otContextService
      .getAtms()
      .map((atm) => atm.numeroAtm.trim())
      .filter((numeroAtm) => numeroAtm.length > 0);

    if (this.atmOptions.length === 0) {
      this.atmId = '';
      this.actualizarUbicacion();
      return;
    }

    if (!this.atmOptions.includes(this.atmId)) {
      this.atmId = this.atmOptions[0];
    }

    this.actualizarUbicacion();
    this.refrescarFotosAtmActual();
  }

  private actualizarUbicacion(): void {
    if (this.atmId.trim().length >= 4) {
      this.comuna = 'Santiago';
      this.direccion = "Av. Libertador Bernardo O'Higgins 1234";
    } else {
      this.comuna = '—';
      this.direccion = '—';
    }
  }

  private refrescarFotosAtmActual(): void {
    if (!this.atmId) {
      this.fotosAtmActual = [];
      return;
    }

    this.fotosAtmActual = this.otContextService.getFotosPorAtm(this.atmId);
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
