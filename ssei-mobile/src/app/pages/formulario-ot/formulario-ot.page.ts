import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { Component, ViewChildren, QueryList, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { recognize } from 'tesseract.js';
import { addIcons } from 'ionicons';
import { cameraOutline, shareSocial, download, documentAttach, arrowBackOutline, arrowForwardOutline, logOutOutline } from 'ionicons/icons';
import { Router, RouterLink } from '@angular/router';
import { Share } from '@capacitor/share';
import { ToastController, LoadingController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { IonCol, IonGrid, IonRow, IonToggle } from '@ionic/angular/standalone';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  IonButtons,
  IonIcon,
  IonSpinner,
  IonList,   // 👈 Agregado para habilitar ion-list
  IonFooter, // 👈 Agregado para habilitar ion-footer
} from '@ionic/angular/standalone';
import { OtAtmDetalle, OtContextService, MedicionElectrica } from '../../ot-context.service';
import { AuthService } from '../../services/auth.service';
import { SignaturePadComponent } from '../../components/signature-pad/signature-pad.component';

@Component({
  selector: 'app-formulario-ot',
  templateUrl: './formulario-ot.page.html',
  styleUrls: ['./formulario-ot.page.scss'],
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
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonButtons,
    IonIcon,
    IonToggle,
    IonGrid,
    IonCol,
    IonRow,
    IonSpinner,
    IonList,           // 👈 Declarado en Imports
    IonFooter,         // 👈 Declarado en Imports
    SignaturePadComponent,
  ]
})
export class FormularioOtPage {
  atms: OtAtmDetalle[] = [];
  indiceAtmActivo = 0;

  validacionZonas = '';
  nombreTecnico = '';
  nombreETV = '';
  nombreAlarma = '';
  guardando = false;

  // Guardadores activos para firmas
  firmaTecnico = '';
  firmaETV = '';
  firmaAlarma = '';
  ubicacion = '';

  @ViewChildren('padTecnico, padETV, padAlarma') pads!: QueryList<SignaturePadComponent>;

  private readonly authService = inject(AuthService);

  constructor(
    private readonly otContextService: OtContextService,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly router: Router
  ) {
    addIcons({ cameraOutline, shareSocial, download, documentAttach, arrowBackOutline, arrowForwardOutline, logOutOutline });
  }

  get atmActivo(): OtAtmDetalle {
    return this.atms[this.indiceAtmActivo];
  }

  get fotosAtmActivo() {
    return this.otContextService.getFotosPorAtm(this.atmActivo?.numeroAtm || '');
  }

  ionViewWillEnter(): void {
    this.atms = this.otContextService.getAtms();

    this.nombreTecnico = this.otContextService.nombreTecnico || localStorage.getItem('tecnico_nombre') || '';
    this.nombreETV = this.otContextService.nombreETV;
    this.nombreAlarma = this.otContextService.nombreAlarma;
    this.ubicacion = this.otContextService.ubicacion;

    const key = `ssei-firmas-temp-${this.otContextService.trabajoActivoId}`;
    const cargo = localStorage.getItem(key);
    if (cargo) {
      try {
        const parsed = JSON.parse(cargo);
        this.firmaTecnico = parsed.firmaTecnico || '';
        this.firmaETV = parsed.firmaETV || '';
        this.firmaAlarma = parsed.firmaAlarma || '';
      } catch (e) {
        console.error('Error al restaurar firmas temporales:', e);
      }
    }
  }

  cerrarSesionTecnico(): void {
    this.authService.presentarConfirmacionLogout();
  }

  cambiarAtm(event: any): void {
    this.indiceAtmActivo = parseInt(event.detail.value, 10);
  }

  onFirmaTecnicoGuardada(base64: string): void {
    this.firmaTecnico = base64;
    this.guardarFirmaTemporal();
  }

  onFirmaETVGuardada(base64: string): void {
    this.firmaETV = base64;
    this.guardarFirmaTemporal();
  }

  onFirmaAlarmaGuardada(base64: string): void {
    this.firmaAlarma = base64;
    this.guardarFirmaTemporal();
  }

  guardarFirmaTemporal(): void {
    this.otContextService.nombreTecnico = this.nombreTecnico;
    this.otContextService.nombreETV = this.nombreETV;
    this.otContextService.nombreAlarma = this.nombreAlarma;
    this.otContextService.setAtms(this.atms);
    this.otContextService.guardarTrabajoActivo();

    const key = `ssei-firmas-temp-${this.otContextService.trabajoActivoId}`;
    localStorage.setItem(key, JSON.stringify({
      firmaTecnico: this.firmaTecnico,
      firmaETV: this.firmaETV,
      firmaAlarma: this.firmaAlarma
    }));
  }

  async procesarOcrEnLote(base64String: string, callback: (texto: string) => void) {
    try {
      const { data: { text } } = await recognize(base64String, 'eng', {
        logger: m => console.log('OCR logging:', m)
      });
      const numerosValidos = text.replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase();
      const match = numerosValidos.match(/[A-Z0-9]{5,15}/g);
      if (match && match.length > 0) {
        callback(match[0]);
      } else {
        callback(text.trim().substring(0, 15));
      }
    } catch (e) {
      console.error('Error OCR en terreno:', e);
    }
  }

  async escanearSerieCajero() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image && image.dataUrl) {
        this.procesarOcrEnLote(image.dataUrl, (txt) => {
          this.atmActivo.serieCajero = txt;
          this.cdr.detectChanges();
          this.guardarFirmaTemporal();
        });
      }
    } catch (e) {
      console.error('Cámara cancelada', e);
    }
  }

  async escanearSerieMmbb() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image && image.dataUrl) {
        this.procesarOcrEnLote(image.dataUrl, (txt) => {
          this.atmActivo.serieMmbb = txt;
          this.cdr.detectChanges();
          this.guardarFirmaTemporal();
        });
      }
    } catch (e) {
      console.error('Cámara cancelada', e);
    }
  }

  async finalizarOT() {
    this.guardando = true;

    // Recubrimos las firmas leyendo del método getDataUrl() presente en el canvas
    this.pads.forEach((pad, index) => {
      const url = pad.getDataUrl();
      if (index === 0) this.firmaTecnico = url;
      if (index === 1) this.firmaETV = url;
      if (index === 2) this.firmaAlarma = url;
    });

    this.otContextService.nombreTecnico = this.nombreTecnico;
    this.otContextService.nombreETV = this.nombreETV;
    this.otContextService.nombreAlarma = this.nombreAlarma;
    this.otContextService.setAtms(this.atms);
    this.otContextService.guardarTrabajoActivo();

    const loading = await this.loadingController.create({
      message: 'Compilando fotos, firmas y generando reporte digital ZIP...',
    });
    await loading.present();

    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
      const clienteNombre = this.otContextService.cliente.replace(/\s+/g, '_') || 'Otros';
      const atmLabel = this.atms.length > 0 ? this.atms[0].numeroAtm.trim() : '0000';
      const nombreRaiz = `REPORTE_${clienteNombre}_ATM_${atmLabel}_${timestamp}`;

      const pdfReporteBlob = await this.generarPdf();

      const zip = new JSZip();
      zip.file(`${nombreRaiz}.pdf`, pdfReporteBlob);

      const carpetaFotos = zip.folder('fotos');
      if (carpetaFotos) {
        let fotoIndex = 1;
        for (const atm of this.atms) {
          const fotos = this.otContextService.getFotosPorAtm(atm.numeroAtm);
          for (const f of fotos) {
            const extension = f.mimeType.split('/')[1] || 'jpg';
            const base64Data = f.previewDataUrl.split(',')[1];
            if (base64Data) {
              carpetaFotos.file(`ATM_${atm.numeroAtm}_FOTO_${fotoIndex}.${extension}`, base64Data, { base64: true });
              fotoIndex++;
            }
          }
        }
      }

      this.crearArchivoFirmasDelZip(zip);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await this.transmitirYGuardarZIP({ nombreRaiz, zipBlob }, loading);

    } catch (e) {
      console.error('Error al generar el paquete consolidado:', e);
      await loading.dismiss();
      this.guardando = false;

      const toast = await this.toastController.create({
        message: 'No se pudo generar el reporte consolidado.',
        duration: 4000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }

  crearArchivoFirmasDelZip(zip: JSZip): void {
    const carpetaFirmas = zip.folder('firmas');
    if (carpetaFirmas) {
      if (this.firmaTecnico && this.firmaTecnico.includes(',')) {
        carpetaFirmas.file('firma_tecnico.png', this.firmaTecnico.split(',')[1], { base64: true });
      }
      if (this.firmaETV && this.firmaETV.includes(',')) {
        carpetaFirmas.file('firma_etv.png', this.firmaETV.split(',')[1], { base64: true });
      }
      if (this.firmaAlarma && this.firmaAlarma.includes(',')) {
        carpetaFirmas.file('firma_alarma.png', this.firmaAlarma.split(',')[1], { base64: true });
      }
    }
  }

  async transmitirYGuardarZIP(paquete: { nombreRaiz: string; zipBlob: Blob }, loading: any) {
    try {
      const { nombreRaiz, zipBlob } = paquete;
      const otIdActiva = this.otContextService.trabajoActivoId;

      const token = localStorage.getItem('token') || localStorage.getItem('auth-token') || '';
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      const formData = new FormData();
      formData.append('file', zipBlob, `${nombreRaiz}.zip`);
      formData.append('categoria', 'respaldo_terreno');
      formData.append('banco', this.otContextService.cliente || 'Otros');
      if (this.atms.length > 0) {
        formData.append('numero_atm', this.atms[0].numeroAtm || '');
      }

      const uploadUrl = 'http://localhost:8000/biblioteca/upload';
      await firstValueFrom(this.http.post(uploadUrl, formData, { headers }));

      if (otIdActiva && !otIdActiva.startsWith('local-')) {
        const updateStateUrl = `http://localhost:8000/ots/${otIdActiva}/estado`;
        await firstValueFrom(this.http.patch(updateStateUrl, { estado: 'sincronizada' }, { headers }));
      }

      await loading.dismiss();
      this.guardando = false;

      const toast = await this.toastController.create({
        message: '¡Orden de trabajo sincronizada exitosamente con la oficina central!',
        duration: 4000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();

      const keyFirmas = `ssei-firmas-temp-${this.otContextService.trabajoActivoId}`;
      localStorage.removeItem(keyFirmas);

      this.otContextService.trabajoActivoId = null;
      this.router.navigate(['/dashboard']);

    } catch (error) {
      console.error('Error al sincronizar la orden:', error);
      await loading.dismiss();
      this.guardando = false;

      const toastError = await this.toastController.create({
        message: 'Error de red en terreno. Los datos se mantendrán guardados en tu dispositivo.',
        duration: 5000,
        color: 'danger',
        position: 'bottom'
      });
      await toastError.present();
    }
  }

  async generarPdf(): Promise<Blob> {
    const arrayBuffer = await firstValueFrom(
      this.http.get('assets/icon/templates/plantilla.pdf', { responseType: 'arraybuffer' })
    );

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const paginas = pdfDoc.getPages();
    const paginaPrincipal = paginas[0];

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const xIzquierda = 51;
    const xDerecha = 312;

    paginaPrincipal.drawText(this.otContextService.cliente || 'Sin Cliente', { x: xIzquierda + 55, y: 641, size: 10, font: helveticaBold, color: rgb(0.12, 0.12, 0.12) });
    paginaPrincipal.drawText(this.otContextService.comuna || 'Metropolitana', { x: xIzquierda + 55, y: 618, size: 9, font: helvetica, color: rgb(0.12, 0.12, 0.12) });
    paginaPrincipal.drawText(this.otContextService.direccion || 'Santiago', { x: xIzquierda + 55, y: 597, size: 9, font: helvetica, color: rgb(0.12, 0.12, 0.12) });
    paginaPrincipal.drawText(this.otContextService.ubicacion || 'Punto sucursal', { x: xIzquierda + 55, y: 576, size: 8, font: helvetica, color: rgb(0.24, 0.24, 0.24) });

    const numAtm = this.atmActivo.numeroAtm || '';
    paginaPrincipal.drawText(numAtm, { x: xDerecha + 72, y: 641, size: 10, font: helveticaBold, color: rgb(0.12, 0.12, 0.12) });
    paginaPrincipal.drawText(this.atmActivo.tipoServicio.toUpperCase(), { x: xDerecha + 72, y: 618, size: 10, font: helveticaBold, color: rgb(0.01, 0.44, 0.8) });
    paginaPrincipal.drawText(this.atmActivo.serieCajero || 'N/A', { x: xDerecha + 72, y: 597, size: 9, font: helvetica, color: rgb(0.12, 0.12, 0.12) });
    paginaPrincipal.drawText(this.atmActivo.serieMmbb || 'N/A', { x: xDerecha + 72, y: 576, size: 9, font: helvetica, color: rgb(0.12, 0.12, 0.12) });

    const med = this.atmActivo.medicionesElectricas || {
      tablero: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
      upsAntigua: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
      upsNueva: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
      tieneUpsNueva: false
    };

    paginaPrincipal.drawText(`${med.tablero.faseNeutro || '0'} V`, { x: 196, y: 494, size: 9, font: helvetica });
    paginaPrincipal.drawText(`${med.tablero.neutroTierra || '0'} V`, { x: 196, y: 477, size: 9, font: helvetica });
    paginaPrincipal.drawText(`${med.tablero.faseTierra || '0'} V`, { x: 196, y: 461, size: 9, font: helvetica });

    paginaPrincipal.drawText(`${med.upsAntigua.faseNeutro || '0'} V`, { x: 308, y: 494, size: 9, font: helvetica });
    paginaPrincipal.drawText(`${med.upsAntigua.neutroTierra || '0'} V`, { x: 308, y: 477, size: 9, font: helvetica });
    paginaPrincipal.drawText(`${med.upsAntigua.faseTierra || '0'} V`, { x: 308, y: 461, size: 9, font: helvetica });

    const tieneNueva = med.tieneUpsNueva ? 'SI' : 'NO';
    paginaPrincipal.drawText(tieneNueva, { x: 426, y: 494, size: 9, font: helveticaBold, color: rgb(0.01, 0.44, 0.8) });

    paginaPrincipal.drawText(`${med.upsNueva.faseNeutro || '0'} V`, { x: 508, y: 494, size: 9, font: helvetica });
    paginaPrincipal.drawText(`${med.upsNueva.neutroTierra || '0'} V`, { x: 508, y: 477, size: 9, font: helvetica });
    paginaPrincipal.drawText(`${med.upsNueva.faseTierra || '0'} V`, { x: 508, y: 461, size: 9, font: helvetica });

    paginaPrincipal.drawText(this.atmActivo.detallesServicio || '', { x: 51, y: 410, size: 9, font: helvetica, maxWidth: 510, lineHeight: 12 });
    paginaPrincipal.drawText(this.atmActivo.observaciones || 'Sin observaciones.', { x: 51, y: 228, size: 9, font: helvetica, maxWidth: 510, lineHeight: 12 });

    paginaPrincipal.drawText(this.nombreTecnico, { x: 53, y: 77, size: 9, font: helveticaBold });
    paginaPrincipal.drawText(this.nombreETV, { x: 232, y: 77, size: 9, font: helveticaBold });
    paginaPrincipal.drawText(this.nombreAlarma, { x: 412, y: 77, size: 9, font: helveticaBold });

    await this.incrustarFirma(pdfDoc, paginaPrincipal, this.firmaTecnico, 53, 91);
    await this.incrustarFirma(pdfDoc, paginaPrincipal, this.firmaETV, 232, 91);
    await this.incrustarFirma(pdfDoc, paginaPrincipal, this.firmaAlarma, 412, 91);

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  }

  async incrustarFirma(pdfDoc: PDFDocument, paginaPrincipal: any, dataUrl: string, x: number, y: number) {
    if (!dataUrl || !dataUrl.includes(',')) {
      paginaPrincipal.drawText('FIRMA NO DISPONIBLE', { x, y: y + 20, size: 7, font: await pdfDoc.embedFont(StandardFonts.HelveticaBold), color: rgb(0.7, 0.7, 0.7) });
      return;
    }
    try {
      const base64 = dataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const imageEmbed = await pdfDoc.embedPng(bytes);
      paginaPrincipal.drawImage(imageEmbed, { x, y, width: 154, height: 49 });
    } catch (e) {
      console.error('Error al incrustar firma en el PDF:', e);
    }
  }
}