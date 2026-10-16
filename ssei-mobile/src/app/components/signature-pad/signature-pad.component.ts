import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline, expandOutline, contractOutline, checkmarkOutline } from 'ionicons/icons';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  template: `
    <div class="sig-wrapper" [class.sig-expanded]="expandido">
      <div class="sig-header">
        <span class="sig-label">{{ label }}</span>
        <button
          type="button"
          class="btn-expand-corner"
          (click)="toggleExpandir()"
          [title]="expandido ? 'Contraer firma' : 'Expandir a pantalla completa'">
          <ion-icon [name]="expandido ? 'contract-outline' : 'expand-outline'"></ion-icon>
        </button>
      </div>

      <div class="sig-canvas-container" #contenedor>
        <canvas #canvas class="sig-canvas"></canvas>
        <p class="sig-hint" *ngIf="vacia">Dibuje su firma aquí</p>
      </div>

      <div class="sig-toolbar">
        <ion-button size="small" fill="clear" color="medium" (click)="limpiar()">
          <ion-icon name="trash-outline" slot="start"></ion-icon>
          Limpiar
        </ion-button>

        <ion-button *ngIf="expandido" size="small" fill="solid" color="primary" (click)="toggleExpandir()">
          <ion-icon name="checkmark-outline" slot="start"></ion-icon>
          Listo
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .sig-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
    }

    .sig-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 24px;
    }

    .sig-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ion-color-medium-shade);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Botón minimalista de dos flechas en la esquina */
    .btn-expand-corner {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--ion-color-primary, #3880ff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      outline: none;
      transition: background-color 0.2s ease, transform 0.15s ease;

      &:active {
        transform: scale(0.92);
        background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.12);
      }

      ion-icon {
        font-size: 1.25rem;
      }
    }

    .sig-canvas-container {
      position: relative;
      border: 1.5px solid var(--ion-color-step-200, #d0d0d0);
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
      height: 110px;
    }

    .sig-canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }

    .sig-hint {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      font-size: 0.82rem;
      color: var(--ion-color-step-400, #aaa);
      pointer-events: none;
    }

    .sig-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* --- MODO EXPANDIDO / PANTALLA COMPLETA HORIZONTAL --- */
    .sig-wrapper.sig-expanded {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #ffffff;
      padding: 16px;
      gap: 12px;
      display: flex;
      flex-direction: column;

      /* Si la pantalla está en vertical, rotamos todo el contenedor 90 grados para simular horizontal */
      @media (orientation: portrait) {
        transform: rotate(90deg);
        transform-origin: center center;
        width: 100vh;
        height: 100vw;
        top: calc((100vh - 100vw) / 2);
        left: calc((100vw - 100vh) / 2);
      }

      .sig-header {
        padding: 0 4px;
      }

      .sig-label {
        font-size: 0.95rem;
        color: var(--ion-color-dark, #222);
      }

      .btn-expand-corner {
        ion-icon {
          font-size: 1.5rem;
          color: var(--ion-color-danger, #eb445a);
        }
      }

      .sig-canvas-container {
        flex: 1;
        height: auto;
        min-height: 200px;
        border: 2px dashed var(--ion-color-primary, #3880ff);
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      }

      .sig-toolbar {
        padding: 4px 0;
      }
    }
  `],
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contenedor') contenedorRef!: ElementRef<HTMLDivElement>;

  @Input() label = 'Firma';

  /** Emite el dataURL PNG al terminar cada trazo, o '' al limpiar. */
  @Output() firmaChange = new EventEmitter<string>();

  vacia = true;
  expandido = false;
  private pad!: SignaturePad;
  private resizeObserver!: ResizeObserver;
  private ultimoDataUrl = '';
  private pausarResizeObserver = false;

  constructor() {
    addIcons({ trashOutline, expandOutline, contractOutline, checkmarkOutline });
  }

  ngAfterViewInit(): void {
    this.ajustarCanvas();
    this.pad = new SignaturePad(this.canvasRef.nativeElement, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#1a1a1a',
      minWidth: 1.2,
      maxWidth: 2.8,
    });

    this.pad.addEventListener('beginStroke', () => {
      this.vacia = false;
    });

    this.pad.addEventListener('endStroke', () => {
      this.emitirFirma();
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (this.pausarResizeObserver) return;
      const dataUrl = this.obtenerDataUrlActual();
      this.ajustarCanvas();
      if (dataUrl) {
        this.restaurarTrazo(dataUrl);
      }
    });
    this.resizeObserver.observe(this.contenedorRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.pad?.off();
    this.restaurarOrientacion();
  }

  toggleExpandir(): void {
    // 1. Respaldar la firma actual antes del cambio de tamaño
    const firmaGuardada = this.obtenerDataUrlActual();

    // 2. Pausar el ResizeObserver para que no borre el canvas durante la animación/transición CSS
    this.pausarResizeObserver = true;
    this.expandido = !this.expandido;

    if (this.expandido) {
      this.bloquearOrientacionHorizontal();
    } else {
      this.restaurarOrientacion();
    }

    // 3. Esperar que el navegador complete la reestructuración del DOM
    setTimeout(() => {
      this.ajustarCanvas();

      if (firmaGuardada) {
        this.restaurarTrazo(firmaGuardada);
      }

      this.pausarResizeObserver = false;
      this.emitirFirma();
    }, 200);
  }

  limpiar(): void {
    this.pad.clear();
    this.vacia = true;
    this.ultimoDataUrl = '';
    this.firmaChange.emit('');
  }

  /** Devuelve el dataURL actual o '' si está vacío. */
  getDataUrl(): string {
    return this.obtenerDataUrlActual();
  }

  private obtenerDataUrlActual(): string {
    if (this.pad && !this.pad.isEmpty()) {
      return this.pad.toDataURL('image/png');
    }
    return this.ultimoDataUrl || '';
  }

  private emitirFirma(): void {
    const data = this.pad.isEmpty() ? '' : this.pad.toDataURL('image/png');
    this.ultimoDataUrl = data;
    this.vacia = !data;
    this.firmaChange.emit(data);
  }

  private ajustarCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const anchoCSS = canvas.offsetWidth;
    const altoCSS = canvas.offsetHeight;

    if (anchoCSS === 0 || altoCSS === 0) return;

    canvas.width = anchoCSS * ratio;
    canvas.height = altoCSS * ratio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }
  }

  private restaurarTrazo(dataUrl: string): void {
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const canvasWidth = canvas.width / ratio;
      const canvasHeight = canvas.height / ratio;

      // Limpiamos el canvas antes de dibujar
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Si está en modo reducido, dejamos un margen (85% del tamaño) para que respire y no toque los bordes
      const factorEscala = this.expandido ? 0.95 : 0.91;

      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      // Calcular proporción conservando el aspecto (aspect ratio) sin deformar
      const escalaX = (canvasWidth * factorEscala) / imgWidth;
      const escalaY = (canvasHeight * factorEscala) / imgHeight;
      const escalaFinal = Math.min(escalaX, escalaY);

      const anchoFinal = imgWidth * escalaFinal;
      const altoFinal = imgHeight * escalaFinal;

      // Centrar exactamente en X e Y
      const posX = (canvasWidth - anchoFinal) / 2;
      const posY = (canvasHeight - altoFinal) / 2;

      ctx.drawImage(img, posX, posY, anchoFinal, altoFinal);

      this.vacia = false;
      this.ultimoDataUrl = dataUrl;
    };
    img.src = dataUrl;
  }

  private bloquearOrientacionHorizontal(): void {
    const screenAny = window.screen as any;
    if (screenAny?.orientation?.lock) {
      screenAny.orientation.lock('landscape').catch(() => { });
    }
  }

  private restaurarOrientacion(): void {
    const screenAny = window.screen as any;
    if (screenAny?.orientation?.unlock) {
      try {
        screenAny.orientation.unlock();
      } catch { }
    }
  }
}