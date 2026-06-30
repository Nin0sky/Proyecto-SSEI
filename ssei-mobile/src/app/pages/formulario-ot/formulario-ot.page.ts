import { HttpClient } from '@angular/common/http';
import { PDFDocument, rgb } from 'pdf-lib';
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
} from '@ionic/angular/standalone';
import { OtAtmDetalle, OtContextService } from '../../ot-context.service';

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
    IonFooter
  ]
})
export class FormularioOtPage {
  atms: OtAtmDetalle[] = [];
  indiceAtmActivo = 0;

  validacionZonas = '';
  nombreTecnico = '';
  nombreETV = '';
  nombreAlarma = '';
  firmaTecnico = '';
  firmaETV = '';
  firmaAlarma = '';

  constructor(
    private readonly otContextService: OtContextService,
    private readonly http: HttpClient // Inyecta HttpClient para leer el asset de plantilla
  ) {
    const atmsGuardados = this.otContextService.getAtms();
    this.atms = atmsGuardados.length > 0 ? atmsGuardados : [this.crearAtm(1)];
  }

  get atmActivo(): OtAtmDetalle {
    return this.atms[this.indiceAtmActivo];
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
  }

  cambiarAtm(event: CustomEvent): void {
    const nuevoIndice = Number(event.detail.value);

    if (!Number.isNaN(nuevoIndice) && this.atms[nuevoIndice]) {
      this.indiceAtmActivo = nuevoIndice;
    }
  }

  ionViewWillLeave(): void {
    this.sincronizarAtms();
  }

  sincronizarAtms(): void {
    this.otContextService.setAtms(this.atms);
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

          escribir('Text6', comunaDetectada);
          escribir('Text3', direccionCompleta);

        }

        // 3. Consolidar el detalle de todos los cajeros (ATMs) en el gran campo de detalleServicio (Text4)
        let detalleCompilado = '';
        this.atms.forEach((atm, i) => {
          detalleCompilado += `Servicio: ${capitalizarPrimera(atm.tipoServicio)}\n`;
          detalleCompilado += `Serie Cajero: ${atm.serieCajero.toUpperCase() || 'S/N'}\n`;
          detalleCompilado += `Serie MMBB: ${atm.serieMmbb.toUpperCase() || 'S/N'}\n`;
          if (atm.detallesServicio) {
            detalleCompilado += `${atm.detallesServicio}\n`;
          }
          if (atm.observaciones) {
            detalleCompilado += `Observaciones: ${atm.observaciones}\n`;
          }
        });

        const campoDetalle = form.getTextField('Text4');
        if (campoDetalle) {
          campoDetalle.setMaxLength(10000);
          const longitud = detalleCompilado.length;
          campoDetalle.setFontSize(longitud > 900 ? 5 : longitud > 600 ? 6 : longitud > 300 ? 8 : 10);
          campoDetalle.setText(detalleCompilado);
        }

        // Asegura que los campos queden visualmente planos y no reactivos
        form.flatten();
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

  async enviarPdf(): Promise<void> {
    const blob = await this.generarPdf();
    if (!blob) {
      return;
    }
    // Lógica para enviar el archivo Blob mediante API POST a FastAPI o compartir mediante Capacitor Share
    console.log('PDF listo para envío:', blob);
  }
}