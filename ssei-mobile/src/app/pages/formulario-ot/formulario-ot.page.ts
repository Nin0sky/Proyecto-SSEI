import { HttpClient } from '@angular/common/http';
import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { Component, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
// import { Component, ChangeDetectorRef } from '@angular/core';
import { recognize } from 'tesseract.js'
import { addIcons } from 'ionicons';
import { cameraOutline, shareSocial, download, documentAttach, arrowBackOutline, arrowForwardOutline } from 'ionicons/icons';
import { RouterLink } from '@angular/router';
import { Share } from '@capacitor/share';
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
  IonFooter,
  IonIcon,
} from '@ionic/angular/standalone';
import { OtAtmDetalle, OtContextService, MedicionElectrica } from '../../ot-context.service';
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
    IonFooter,
    SignaturePadComponent,
    IonIcon,
    IonToggle,
    IonGrid,
    IonCol,
    IonRow,
  ]
})
export class FormularioOtPage {
  atms: OtAtmDetalle[] = [];
  indiceAtmActivo = 0;

  validacionZonas = '';
  nombreTecnico = '';
  nombreETV = '';
  nombreAlarma = '';

  // DataURL PNG de cada firma (‘’ = sin firma)
  firmaTecnico = '';
  firmaETV = '';
  firmaAlarma = '';
  ubicacion = '';

  constructor(
    private readonly otContextService: OtContextService,
    private readonly http: HttpClient, // Inyecta HttpClient para leer el asset de plantilla
    private readonly cdr: ChangeDetectorRef,
  ) {
    addIcons({ cameraOutline, shareSocial, download, documentAttach, arrowBackOutline, arrowForwardOutline });


    const atmsGuardados = this.otContextService.getAtms();
    this.atms = this.migrarMediciones(atmsGuardados.length > 0 ? atmsGuardados : [this.crearAtm(1)]);
  }

  ionViewWillEnter(): void {
    const atmsGuardados = this.otContextService.getAtms();
    this.atms = this.migrarMediciones(atmsGuardados.length > 0 ? atmsGuardados : [this.crearAtm(1)]);
    this.nombreTecnico = this.otContextService.nombreTecnico;
    this.nombreETV = this.otContextService.nombreETV;
    this.nombreAlarma = this.otContextService.nombreAlarma;
    this.ubicacion = this.otContextService.ubicacion;
  }

  get atmActivo(): OtAtmDetalle {
    return this.atms[this.indiceAtmActivo];
  }

  private migrarMediciones(atms: OtAtmDetalle[]): OtAtmDetalle[] {
    return atms.map(atm => {
      if (atm.medicionesElectricas) return atm;
      return {
        ...atm,
        medicionesElectricas: {
          tablero: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
          upsAntigua: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
          upsNueva: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
          tieneUpsNueva: false,
        },
      };
    });
  }
  private readonly tiposSinSeries = new Set([
    'serviciotecnico',
    'servicioelectrico',
    'grafica',
    'pintura',
    'asistencia',
  ]);

  get esServicioElectrico(): boolean {
    return this.normalizarTipoServicio(this.atmActivo?.tipoServicio) === 'servicioelectrico';
  }
  get mostrarCamposSeries(): boolean {
    const tipo = this.normalizarTipoServicio(this.atmActivo?.tipoServicio);
    return !this.tiposSinSeries.has(tipo);
  }

  private normalizarTipoServicio(tipo: string | null | undefined): string {
    return (tipo ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  private readonly tiposSeriesOpcionalesPdf = new Set([
    'serviciotecnico',
    'grafica',
    'transporte',
  ]);

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
  }

  cambiarAtm(event: CustomEvent): void {
    const nuevoIndice = Number(event.detail.value);

    if (!Number.isNaN(nuevoIndice) && this.atms[nuevoIndice]) {
      this.indiceAtmActivo = nuevoIndice;
    }
  }

  ionViewWillLeave(): void {
    this.sincronizarAtms();
    this.otContextService.nombreTecnico = this.nombreTecnico;
    this.otContextService.nombreETV = this.nombreETV;
    this.otContextService.nombreAlarma = this.nombreAlarma;
    this.otContextService.ubicacion = this.ubicacion;
  }

  sincronizarAtms(): void {
    this.otContextService.setAtms(this.atms);
  }
  private normalizarVoltaje(valor: string): string {
    const limpio = valor.trim();
    if (!limpio) return '';
    if (/v$/i.test(limpio)) return limpio.slice(0, -1).trim() + 'V';
    if (/^[\d.,]+$/.test(limpio)) return limpio + 'V';
    return limpio;
  }

  normalizarVoltajeBlur(event: Event, medicion: MedicionElectrica, campo: keyof MedicionElectrica): void {
    const valorNormalizado = this.normalizarVoltaje(medicion[campo]);
    medicion[campo] = valorNormalizado;
    // Actualiza directamente el valor en el elemento ion-input
    (event.target as any).value = valorNormalizado;
    this.sincronizarAtms();
  }

  private readonly etiquetasTipoServicio: Record<string, string> = {
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

  private etiquetaTipoServicio(tipo: string): string {
    return this.etiquetasTipoServicio[this.normalizarTipoServicio(tipo)] ?? tipo;
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
      medicionesElectricas: {
        tablero: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
        upsAntigua: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
        upsNueva: { faseNeutro: '', neutroTierra: '', faseTierra: '' },
        tieneUpsNueva: false,
      }
    };
  }

  private reenumerarAtms(): void {
    this.atms = this.atms.map((atm, index) => ({
      ...atm,
      etiqueta: `ATM ${index + 1}`,
    }));
  }

  // 1. Agrega el prefijo 'async' para admitir los 'await' en el interior
  private async generarPdf(): Promise<Blob | null> {
    try {
      // Obtener el archivo base PDF verdadero desde los assets de Ionic
      const urlPlantilla = 'assets/icon/templates/OT_base (5).pdf';
      const arrayBufferBase = await this.http.get(urlPlantilla, { responseType: 'arraybuffer' }).toPromise();

      if (!arrayBufferBase) {
        throw new Error('No se pudo cargar la plantilla PDF.');
      }

      // Cargar el PDF en pdf-lib
      const pdfDoc = await PDFDocument.load(arrayBufferBase);

      // Obtener el formulario interactivo si el PDF tiene campos programables (AcroForm)
      const form = pdfDoc.getForm();
      const camposDisponibles = form.getFields().map(f => f.getName());
      console.log('Campos interactivos encontrados en la plantilla:', camposDisponibles);

      const titleCase = (t: string): string =>
        t.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      const capitalizarPrimera = (t: string): string =>
        t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

      if (camposDisponibles.length > 0) {
        // --- CASO A: Rellenar si el PDF es interactivo (tiene inputs nativos) ---
        // Helper para escribir en un campo eliminando su maxLength primero
        const escribir = (nombre: string, valor: string): void => {
          const campo = form.getTextField(nombre);
          if (campo) {
            campo.setMaxLength(10000);
            campo.setText(valor);
          }
        };

        // 1. Datos estáticos / generales
        escribir('Text1', this.otContextService.cliente || '');
        escribir('Text8', this.nombreTecnico ? titleCase(this.nombreTecnico) : '');
        escribir('Text13', this.nombreETV ? titleCase(this.nombreETV) : '');
        escribir('Text12', this.nombreAlarma ? titleCase(this.nombreAlarma) : '');
        escribir('Text10', this.validacionZonas || '');
        // Formatear fecha del trabajo actual
        const hoy = new Date().toLocaleDateString('es-CL');
        escribir('Text5', hoy);
        escribir('Text11', '');
        escribir('Text9', '');

        // Cantidad de cajeros
        const todosLosNumeros = this.atms
          .map(a => a.numeroAtm.trim())
          .filter(n => n.length > 0)
          .join('-');
        escribir('Text7', todosLosNumeros ? `${todosLosNumeros}` : '');

        // 2. Resolver dirección, comuna y ubicación
        if (this.atms.length > 0) {
          const primerAtmNum = this.atms[0].numeroAtm.trim();
          const comunaDetectada = primerAtmNum.length >= 4 ? 'Santiago' : '';
          const direccionCompleta = primerAtmNum.length >= 4 ? "Av. Libertador Bernardo O'Higgins 1234" : '';

          escribir('Text6', this.otContextService.comuna || '');
          escribir('Text3', this.otContextService.direccion || '');
          escribir('Text2', this.otContextService.ubicacion || '');

        }
        // 3. Consolidar el detalle de todos los cajeros (ATMs) en el gran campo de detalleServicio (Text4)
        let detalleCompilado = '';
        this.atms.forEach((atm) => {
          const tipoNormalizado = this.normalizarTipoServicio(atm.tipoServicio);
          const seriesOpcionales = this.tiposSeriesOpcionalesPdf.has(tipoNormalizado);
          const serieCajero = atm.serieCajero.trim().toUpperCase();
          const serieMmbb = atm.serieMmbb.trim().toUpperCase();

          detalleCompilado += `Tipo de servicio: ${this.etiquetaTipoServicio(atm.tipoServicio)}\n`;

          if (tipoNormalizado === 'servicioelectrico' && atm.medicionesElectricas) {
            const med = atm.medicionesElectricas;
            const fila = (label: string, t: string, a: string, n?: string) =>
              `${label.padEnd(16)} ${t.padEnd(18)} ${a.padEnd(20)}${med.tieneUpsNueva && n ? ' ' + n : ''}\n`;

            detalleCompilado += `${''.padEnd(22)} Tablero   UPS Antigua${med.tieneUpsNueva ? '  UPS Nueva' : ''}\n`;
            detalleCompilado += fila('Fase-Neutro:'.padEnd(10), med.tablero.faseNeutro, med.upsAntigua.faseNeutro, med.upsNueva.faseNeutro);
            detalleCompilado += fila('Neutro-Tierra:'.padEnd(14), med.tablero.neutroTierra, med.upsAntigua.neutroTierra, med.upsNueva.neutroTierra);
            detalleCompilado += fila('Fase-Tierra:'.padEnd(14), med.tablero.faseTierra, med.upsAntigua.faseTierra, med.upsNueva.faseTierra);
          } else if (seriesOpcionales) {
            if (serieCajero) detalleCompilado += `Serie Cajero: ${serieCajero}\n`;
            if (serieMmbb) detalleCompilado += `Serie MMBB: ${serieMmbb}\n`;
          } else {
            detalleCompilado += `Serie Cajero: ${serieCajero || 'S/N'}\n`;
            detalleCompilado += `Serie MMBB: ${serieMmbb || 'S/N'}\n`;
          }

          if (atm.detallesServicio) detalleCompilado += `${atm.detallesServicio}\n`;
          if (atm.observaciones) detalleCompilado += `Observaciones: ${atm.observaciones}\n`;
        });

        // Escribir el detalle compilado en Text4, DESPUÉS de terminar el loop
        const campoDetalle = form.getTextField('Text4');
        if (campoDetalle) {
          campoDetalle.setMaxLength(10000);
          const longitud = detalleCompilado.length;
          campoDetalle.setFontSize(longitud > 900 ? 5 : longitud > 600 ? 6 : longitud > 300 ? 8 : 10);
          campoDetalle.setText(detalleCompilado);
        }


        const limpiarBordesCampos = (): void => {
          for (const field of form.getFields()) {
            const acroField = (field as any).acroField;
            const widgets = acroField?.getWidgets?.() ?? [];
            for (const widget of widgets) {
              const bs = widget.getOrCreateBorderStyle?.();
              bs?.setWidth?.(0);

              const mk = widget.getOrCreateAppearanceCharacteristics?.();
              mk?.setBorderColor?.([1, 1, 1]); // blanco
              // Opcional: fondo transparente/neutral según viewer
              // mk?.setBackgroundColor?.([1, 1, 1]);
            }
          }
        };

        limpiarBordesCampos();

        // Asegura que los campos queden visualmente planos y no reactivos
        form.flatten();

        // --- Incrustar firmas como imágenes PNG ---
        // TODO: ajustar x, y, width, height a las coordenadas exactas del PDF
        // una vez que se identifiquen los campos de firma en la plantilla.
        // Las coordenadas son en puntos (pt) desde la esquina inferior-izquierda.
        await this.incrustarFirma(pdfDoc, pdfDoc.getPages()[0], this.firmaTecnico,
          { x: 3, y: 3, width: 130, height: 33 });  // TODO: campo firma técnico
        await this.incrustarFirma(pdfDoc, pdfDoc.getPages()[0], this.firmaETV,
          { x: 70, y: 3, width: 130, height: 33 });  // TODO: campo firma ETV
        await this.incrustarFirma(pdfDoc, pdfDoc.getPages()[0], this.firmaAlarma,
          { x: 168, y: 3, width: 130, height: 33 });  // TODO: campo firma Alarma
      } else {
        // --- CASO B: Dibujar texto por Coordenadas (si el PDF es estático) ---
        const paginas = pdfDoc.getPages();
        const primeraPagina = paginas[0];

        // Coordenadas fijas donde situar la información estática
        primeraPagina.drawText(this.nombreTecnico, { x: 100, y: 700, size: 10, color: rgb(0, 0, 0) });
        primeraPagina.drawText(this.nombreETV, { x: 100, y: 680, size: 10 });
        primeraPagina.drawText(this.nombreAlarma, { x: 100, y: 660, size: 10 });
        primeraPagina.drawText(this.validacionZonas, { x: 100, y: 600, size: 9 });

        // Iterar y dibujar los cajeros usando una proyección lineal decreciente
        const yInicial = 500;
        const pasoY = 40;
        this.atms.forEach((atm, i) => {
          const yActual = yInicial - (i * pasoY);
          primeraPagina.drawText(atm.numeroAtm, { x: 80, y: yActual, size: 10 });
          primeraPagina.drawText(atm.tipoServicio, { x: 180, y: yActual, size: 10 });
          primeraPagina.drawText(atm.serieCajero, { x: 280, y: yActual, size: 10 });
          primeraPagina.drawText(atm.serieMmbb, { x: 380, y: yActual, size: 10 });
        });
      }

      // Salvar y compilar el documento rellenado
      const pdfBytesBytes = await pdfDoc.save();

      // Utilizar la propiedad .buffer forzada explícitamente a un ArrayBuffer estándar
      const blob = new Blob([pdfBytesBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      return blob;

    } catch (error) {
      console.error('Error generando el archivo PDF:', error);
      return null;
    }
  }

  async descargarPdf(): Promise<void> {
    const blob = await this.generarPdf();
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OT_Tecnico_${this.nombreTecnico || 'Sin_Nombre'}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  }

  async descargarPaquete(): Promise<void> {
    const paquete = await this.generarZipPaquete();
    if (!paquete) {
      return;
    }

    const { nombreRaiz, zipBlob } = paquete;
    const url = window.URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreRaiz}.zip`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async compartirPaquete(): Promise<void> {
    try {
      const paquete = await this.generarZipPaquete();
      if (!paquete) {
        return;
      }

      const { nombreRaiz, zipBlob } = paquete;
      const zipBase64 = await this.blobToBase64(zipBlob);

      const resultado = await Filesystem.writeFile({
        path: `${nombreRaiz}.zip`,
        data: zipBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: 'Compartir paquete OT',
        text: `Paquete OT ${nombreRaiz}`,
        url: resultado.uri,
        dialogTitle: 'Compartir paquete OT',
      });
    } catch (error) {
      console.error('Error al compartir paquete:', error);
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultado = reader.result as string;
        resolve(resultado.split(',')[1] ?? '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private formatearFechaArchivo(fecha = new Date()): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  private normalizarNombreArchivo(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private construirNombrePaquete(): string {
    const numerosAtm = this.atms
      .map((a) => a.numeroAtm.trim())
      .filter(Boolean)
      .join('-') || 'SIN_ATM';

    const tiposServicio = Array.from(
      new Set(
        this.atms
          .map((a) => a.tipoServicio?.trim())
          .filter(Boolean)
      )
    ).join('-') || 'sin-servicio';

    const fecha = this.formatearFechaArchivo();

    return this.normalizarNombreArchivo(`${numerosAtm}_${fecha}_${tiposServicio}`);
  }

  private async generarZipPaquete(): Promise<{ nombreRaiz: string; zipBlob: Blob } | null> {
    const nombreRaiz = this.construirNombrePaquete();
    const zip = new JSZip();
    const carpetaRaiz = zip.folder(nombreRaiz);

    if (!carpetaRaiz) {
      return null;
    }

    const pdfBlob = await this.generarPdf();
    if (pdfBlob) {
      const pdfBuffer = await pdfBlob.arrayBuffer();
      carpetaRaiz.file(`OT_${nombreRaiz}.pdf`, pdfBuffer);
    }

    for (const atm of this.atms) {
      const numeroAtm = atm.numeroAtm.trim();
      if (!numeroAtm) {
        continue;
      }

      const fotos = this.otContextService.getFotosPorAtm(numeroAtm);
      if (fotos.length === 0) {
        continue;
      }

      const tipoServicio = this.normalizarNombreArchivo(atm.tipoServicio || 'sin-servicio');
      const carpetaAtm = carpetaRaiz.folder(`ATM_${numeroAtm}_${tipoServicio}`);

      for (const foto of fotos) {
        const base64Data = foto.previewDataUrl.split(',')[1] ?? '';
        if (!base64Data) {
          continue;
        }
        carpetaAtm?.file(foto.nombreArchivo, base64Data, { base64: true });
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { nombreRaiz, zipBlob };
  }

  async enviarPdf(): Promise<void> {
    const blob = await this.generarPdf();
    if (!blob) {
      return;
    }

    console.log('PDF listo para envío:', blob);
  }


  // -------------------------------------------------------------------------
  // Helpers de firma
  // -------------------------------------------------------------------------

  private async incrustarFirma(
    pdfDoc: PDFDocument,
    page: ReturnType<PDFDocument['getPages']>[number],
    dataUrl: string,
    pos: { x: number; y: number; width: number; height: number },
  ): Promise<void> {
    if (!dataUrl) {
      return;
    }
    try {
      const base64 = dataUrl.split(',')[1];
      const pngBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const img = await pdfDoc.embedPng(pngBytes);
      page.drawImage(img, pos);
    } catch {
      // Si la imagen falla no interrumpir la generación del PDF
    }
  }
  // Metodos para escaneo de series
  escaneandoSerieCajero = false;
  escaneandoSerieMmbb = false;

  private normalizarSerie(texto: string): string {
    return texto
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .trim();
  }

  private extraerSerie(texto: string): string {
    const candidatos = (texto.toUpperCase().match(/[A-Z0-9-]{4,}/g) ?? [])
      .map((c) => this.normalizarSerie(c))
      .filter((c) => c.length >= 4);
    return candidatos[0] ?? '';
  }

  async escanearSerie(campo: 'serieCajero' | 'serieMmbb'): Promise<void> {
    if (!this.atmActivo) {
      return;
    }

    if (campo === 'serieCajero') {
      this.escaneandoSerieCajero = true;
    } else {
      this.escaneandoSerieMmbb = true;
    }

    try {
      const foto = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        quality: 75,
      });

      if (!foto.base64String) {
        return;
      }

      const dataUrl = 'data:image/jpeg;base64,' + foto.base64String;
      const resultado = await recognize(dataUrl, 'eng');
      const serie = this.extraerSerie(resultado.data.text);

      if (!serie) {
        return;
      }

      if (campo === 'serieCajero') {
        this.atmActivo.serieCajero = serie;
      } else {
        this.atmActivo.serieMmbb = serie;
      }

      this.sincronizarAtms();
    } catch (error) {
      console.error('Error OCR de serie:', error);
    } finally {
      if (campo === 'serieCajero') {
        this.escaneandoSerieCajero = false;
      } else {
        this.escaneandoSerieMmbb = false;
      }
    }
  }

}