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
import { trashOutline } from 'ionicons/icons';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  template: `
    <div class="sig-wrapper">
      <span class="sig-label">{{ label }}</span>
      <div class="sig-canvas-container" #contenedor>
        <canvas #canvas class="sig-canvas"></canvas>
        <p class="sig-hint" *ngIf="vacia">Dibuje su firma aquí</p>
      </div>
      <div class="sig-toolbar">
        <ion-button size="small" fill="clear" color="medium" (click)="limpiar()">
          <ion-icon name="trash-outline" slot="start"></ion-icon>
          Limpiar
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .sig-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sig-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ion-color-medium-shade);
      text-transform: uppercase;
      letter-spacing: 0.04em;
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
      justify-content: flex-end;
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
  private pad!: SignaturePad;
  private resizeObserver!: ResizeObserver;

  constructor() {
    addIcons({ trashOutline });
  }

  ngAfterViewInit(): void {
    this.ajustarCanvas();
    this.pad = new SignaturePad(this.canvasRef.nativeElement, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#1a1a1a',
      minWidth: 1,
      maxWidth: 2.5,
    });

    this.pad.addEventListener('beginStroke', () => {
      this.vacia = false;
    });

    this.pad.addEventListener('endStroke', () => {
      this.firmaChange.emit(
        this.pad.isEmpty() ? '' : this.pad.toDataURL('image/png'),
      );
    });

    this.resizeObserver = new ResizeObserver(() => {
      const dataUrl = !this.pad.isEmpty()
        ? this.pad.toDataURL('image/png')
        : null;
      this.ajustarCanvas();
      // Restaurar trazos si los había tras el resize
      if (dataUrl) {
        const img = new Image();
        img.onload = () =>
          this.canvasRef.nativeElement
            .getContext('2d')
            ?.drawImage(img, 0, 0);
        img.src = dataUrl;
      }
    });
    this.resizeObserver.observe(this.contenedorRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.pad?.off();
  }

  limpiar(): void {
    this.pad.clear();
    this.vacia = true;
    this.firmaChange.emit('');
  }

  /** Devuelve el dataURL actual o '' si está vacío. */
  getDataUrl(): string {
    return this.pad && !this.pad.isEmpty()
      ? this.pad.toDataURL('image/png')
      : '';
  }

  private ajustarCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
  }
}
