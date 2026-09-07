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
  IonList,
  IonFooter,
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
    IonList,
    IonFooter,
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

  firmaTecnico = '';
  firmaETV = '';
  firmaAlarma = '';
  ubicacion = '';

  @ViewChildren('padTecnico, padETV, padAlarma') pads!: QueryList<SignaturePadComponent>;

  private readonly authService = inject(AuthService);

  // Categorías que NO requieren ingreso obligatorio de series
  private readonly tiposSinSeries = new Set([
    'serviciotecnico',
    'servicioelectrico',
    'grafica',
    'pintura',
    'asistencia',
  ]);

  // Categorías donde las series en el PDF son opcionales (sólo se imprimen si se llenaron)
  private readonly tiposSeriesOpcionalesPdf = new Set([
    'serviciotecnico',
    'grafica',
    'transporte',
  ]);

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

  get esServicioElectrico(): boolean {
    return this.normalizarTipoServicio(this.atmActivo?.tipoServicio) === 'servicioelectrico';
  }

  get mostrarCamposSeries(): boolean {
    const tipo = this.normalizarTipoServicio(this.atmActivo?.tipoServicio);
    return !this.tiposSinSeries.has(tipo);
  }

  get fotosAtmActivo() {
    return this.otContextService.getFotosPorAtm(this.atmActivo?.numeroAtm || '');
  }

  ionViewWillEnter(): void {
    this.atms = this.otContextService.getAtms();

    this.nombreTecnico = this.otContextService.nombreTecnico || localStorage.getItem('tecnico_nombre') || '';
    this.nombreETV = this.otContextService.nombreETV || '';
    this.nombreAlarma = this.otContextService.nombreAlarma || '';
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
      this.http.get('assets/icon/templates/OT_base (5).pdf', { responseType: 'arraybuffer' })
    );

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const paginas = pdfDoc.getPages();
    const paginaPrincipal = paginas[0];

    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    const form = pdfDoc.getForm();
    const camposDisponibles = form.getFields().map(f => f.getName());

    const titleCase = (t: string): string =>
      t.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    if (camposDisponibles.length > 0) {
      const escribir = (nombre: string, valor: string): void => {
        const campo = form.getTextField(nombre);
        if (campo) {
          campo.setMaxLength(10000);
          campo.setText(valor);
        }
      };

      // 1. Datos Generales de Cabecera y Nombres
      escribir('Text1', this.otContextService.cliente || '');
      escribir('Text8', this.nombreTecnico ? titleCase(this.nombreTecnico) : '');
      escribir('Text13', this.nombreETV ? titleCase(this.nombreETV) : '');
      escribir('Text12', this.nombreAlarma ? titleCase(this.nombreAlarma) : '');
      escribir('Text10', this.validacionZonas || '');

      const hoy = new Date().toLocaleDateString('es-CL');
      escribir('Text5', hoy);

      // Consolidar únicamente el número o código del ATM (sin el prefijo 'ATM ')
      const todosLosNumeros = this.atms
        .map(a => a.numeroAtm.trim())
        .filter(n => n.length > 0)
        .join(' - ');
      escribir('Text7', todosLosNumeros ? todosLosNumeros : '');

      escribir('Text6', this.otContextService.comuna || '');
      escribir('Text3', this.otContextService.direccion || '');
      escribir('Text2', this.otContextService.ubicacion || '');

      // 2. Compilar Detalle del Servicio (Text4) con lógica condicional exacta
      let detalleCompilado = '';
      this.atms.forEach((atm) => {
        const tipoNormalizado = this.normalizarTipoServicio(atm.tipoServicio);
        const seriesOpcionales = this.tiposSeriesOpcionalesPdf.has(tipoNormalizado);
        const serieCajero = atm.serieCajero ? atm.serieCajero.trim().toUpperCase() : '';
        const serieMmbb = atm.serieMmbb ? atm.serieMmbb.trim().toUpperCase() : '';

        // Título del tipo de servicio en mayúsculas (sin prefijo de ATM)
        detalleCompilado += `${this.etiquetaTipoServicio(atm.tipoServicio).toUpperCase()}\n`;

        // Si es Servicio Eléctrico: Se imprime la tabla de mediciones
        if (tipoNormalizado === 'servicioelectrico' && atm.medicionesElectricas) {
          const med = atm.medicionesElectricas;
          const labelWidth = 18;
          const colWidth = 15;

          const fila = (label: string, tableroVal: string, upsAntiguaVal: string, upsNuevaVal?: string) => {
            const lRef = label.padEnd(labelWidth, ' ');
            const tRef = tableroVal.padEnd(colWidth, ' ');
            const aRef = upsAntiguaVal.padEnd(colWidth, ' ');
            const nRef = med.tieneUpsNueva && upsNuevaVal ? upsNuevaVal.padEnd(colWidth, ' ') : '';
            return `${lRef}${tRef}${aRef}${nRef}\n`;
          };

          const headerLabel = ''.padEnd(labelWidth, ' ');
          const headerTablero = 'Tablero'.padEnd(colWidth, ' ');
          const headerAntigua = 'UPS Antigua'.padEnd(colWidth, ' ');
          const headerNueva = med.tieneUpsNueva ? 'UPS Nueva'.padEnd(colWidth, ' ') : '';

          detalleCompilado += `${headerLabel}${headerTablero}${headerAntigua}${headerNueva}\n`;
          detalleCompilado += `------------------------------------------------------------\n`;
          detalleCompilado += fila('Fase-Neutro:', (med.tablero.faseNeutro || '0') + 'V', (med.upsAntigua.faseNeutro || '0') + 'V', (med.upsNueva.faseNeutro || '0') + 'V');
          detalleCompilado += fila('Neutro-Tierra:', (med.tablero.neutroTierra || '0') + 'V', (med.upsAntigua.neutroTierra || '0') + 'V', (med.upsNueva.neutroTierra || '0') + 'V');
          detalleCompilado += fila('Fase-Tierra:', (med.tablero.faseTierra || '0') + 'V', (med.upsAntigua.faseTierra || '0') + 'V', (med.upsNueva.faseTierra || '0') + 'V');
          detalleCompilado += `------------------------------------------------------------\n`;

        } else if (seriesOpcionales) {
          // Si es Servicio Técnico, Gráfica, etc.: Series son opcionales, sólo se imprimen si existen
          if (serieCajero) detalleCompilado += `Serie Cajero: ${serieCajero}\n`;
          if (serieMmbb) detalleCompilado += `Serie MMBB: ${serieMmbb}\n`;
        } else {
          // Para Instalación, Desanclaje, etc.: Se imprimen con S/N por defecto si faltan
          detalleCompilado += `Serie Cajero: ${serieCajero || 'S/N'}\n`;
          detalleCompilado += `Serie MMBB: ${serieMmbb || 'S/N'}\n`;
        }

        if (atm.detallesServicio) {
          detalleCompilado += `Detalles: ${atm.detallesServicio}\n`;
        }
        if (atm.observaciones) {
          detalleCompilado += `Observaciones: ${atm.observaciones}\n`;
        }
        detalleCompilado += `\n`;
      });

      const campoDetalle = form.getTextField('Text4');
      if (campoDetalle) {
        campoDetalle.setMaxLength(12000);
        const longitud = detalleCompilado.length;
        campoDetalle.setFontSize(longitud > 900 ? 6 : longitud > 600 ? 7 : longitud > 300 ? 8 : 10);
        campoDetalle.updateAppearances(courierFont);
        campoDetalle.setText(detalleCompilado);
      }

      // Quitar bordes de campos
      for (const field of form.getFields()) {
        const acroField = (field as any).acroField;
        const widgets = acroField?.getWidgets?.() ?? [];
        for (const widget of widgets) {
          const bs = widget.getOrCreateBorderStyle?.();
          bs?.setWidth?.(0);
          const mk = widget.getOrCreateAppearanceCharacteristics?.();
          mk?.setBorderColor?.([1, 1, 1]);
        }
      }

      form.flatten();
    }

    // --- Incrustación de Firmas en sus casilleros exactos de pie de página ---
    await this.incrustarFirma(pdfDoc, paginaPrincipal, this.firmaTecnico, 3, 3);
    await this.incrustarFirma(pdfDoc, paginaPrincipal, this.firmaETV, 70, 3);
    await this.incrustarFirma(pdfDoc, paginaPrincipal, this.firmaAlarma, 168, 3);

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  }

  private etiquetaTipoServicio(tipo: string): string {
    const etiquetas: Record<string, string> = {
      serviciotecnico: 'Servicio Técnico',
      servicioelectrico: 'Servicio Eléctrico',
      instalacion: 'Instalación',
      desanclaje: 'Desanclaje',
      movimientointerno: 'Movimiento Interno',
      transporte: 'Transporte',
      grafica: 'Gráfica',
      pintura: 'Pintura',
      asistencia: 'Asistencia',
    };
    return etiquetas[this.normalizarTipoServicio(tipo)] ?? tipo;
  }

  private normalizarTipoServicio(tipo: string | null | undefined): string {
    return (tipo ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  async incrustarFirma(pdfDoc: PDFDocument, paginaPrincipal: any, dataUrl: string, x: number, y: number) {
    if (!dataUrl || !dataUrl.includes(',')) {
      return;
    }
    try {
      const base64 = dataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const imageEmbed = await pdfDoc.embedPng(bytes);
      paginaPrincipal.drawImage(imageEmbed, { x, y, width: 130, height: 33 });
    } catch (e) {
      console.error('Error al incrustar firma en el PDF:', e);
    }
  }
}