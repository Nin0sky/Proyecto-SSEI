import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input'; // 👈 Asegurado
import { MatFormFieldModule } from '@angular/material/form-field'; // 👈 Agregado para corregir rotura visual
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

interface ImagenExtraida {
  nombre: string;
  base64: string;
}

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule, // 👈 Registrado estrictamente en imports de Componente Standalone
    MatInputModule,     // 👈 Registrado estrictamente en imports
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './informes.component.html',
  styleUrls: ['./informes.component.scss']
})
export class InformesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bibliotecaService = inject(BibliotecaService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef); // Sincronizador de Detección de Cambios

  paquetesZip = signal<any[]>([]);
  isLoadingDocs = signal<boolean>(false);
  isLoadingZip = signal<boolean>(false);
  isGenerating = signal<boolean>(false);

  // Fotos extraídas (Excluyentes de firmas)
  imagenesZip = signal<ImagenExtraida[]>([]);

  // 📷 Modales independientes
  fotoPrevisualizar = signal<ImagenExtraida | null>(null); // Lightbox vista previa
  mostrarModalSeleccion = signal<boolean>(false);          // Modal de asignación
  slotActivo = signal<number | null>(null);                // Tarjeta de foto en edición

  previsualizacionCliente = signal<string | null>(null);
  previsualizacionServicio = signal<string | null>(null);
  previsualizacionOt = signal<string | null>(null);

  informeForm!: FormGroup;

  ngOnInit(): void {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    this.inicializarFormulario();
    this.cargarZipsBiblioteca();
  }

  inicializarFormulario(): void {
    this.informeForm = this.fb.group({
      numeroAtm: ['', Validators.required],
      banco: ['', Validators.required],
      tipoSolicitud: ['', Validators.required],
      comentarioGeneral: [''],
      formato: ['pdf', Validators.required],
      
      pasosDetalle: this.fb.array([
        this.fb.control('Inspección visual inicial en el punto solicitado.', Validators.required),
        this.fb.control('Desmontaje técnico y verificación de fuentes energéticas.', Validators.required),
        this.fb.control('Ajuste de parámetros y pruebas de enlace operativo.', Validators.required)
      ]),

      fotosAsignadas: this.fb.array([
        this.crearGrupoFoto('Fotografía Inicial de Arribo'),
        this.crearGrupoFoto('Verificación de Integridad de Módulo'),
        this.crearGrupoFoto('Entrega Concluida y Operativa')
      ]),

      clienteLogoBase64: [null],
      servicioImgBase64: [null],
      otImgBase64: [null]
    });
  }

  get pasosDetalle() {
    return this.informeForm.get('pasosDetalle') as FormArray;
  }

  get fotosAsignadas() {
    return this.informeForm.get('fotosAsignadas') as FormArray;
  }

  crearGrupoFoto(titulo: string = ''): FormGroup {
    return this.fb.group({
      titulo: [titulo, Validators.required],
      imagen_base64: [null, Validators.required]
    });
  }

  agregarPasoTecnico(): void {
    this.pasosDetalle.push(this.fb.control('', Validators.required));
    this.cdr.detectChanges();
  }

  eliminarPasoTecnico(index: number): void {
    this.pasosDetalle.removeAt(index);
    this.cdr.detectChanges();
  }

  agregarSeccionFoto(): void {
    this.fotosAsignadas.push(this.crearGrupoFoto('Nueva Fotografía'));
    this.cdr.detectChanges();
  }

  eliminarSeccionFoto(index: number): void {
    this.fotosAsignadas.removeAt(index);
    this.cdr.detectChanges();
  }

  cargarZipsBiblioteca(): void {
    this.isLoadingDocs.set(true);
    this.bibliotecaService.listarDocumentos().subscribe({
      next: (docs) => {
        const filtrados = docs.filter(doc => doc.nombreOriginal.toLowerCase().endsWith('.zip'));
        this.paquetesZip.set(filtrados);
        this.isLoadingDocs.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al sincronizar con biblioteca histórica.');
        this.isLoadingDocs.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  onFileChange(event: any, campo: 'cliente' | 'servicio' | 'ot'): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Str = reader.result as string;
        if (campo === 'cliente') {
          this.previsualizacionCliente.set(base64Str);
          this.informeForm.patchValue({ clienteLogoBase64: base64Str });
        } else if (campo === 'servicio') {
          this.previsualizacionServicio.set(base64Str);
          this.informeForm.patchValue({ servicioImgBase64: base64Str });
        } else if (campo === 'ot') {
          this.previsualizacionOt.set(base64Str);
          this.informeForm.patchValue({ otImgBase64: base64Str });
        }
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  onZipSeleccionado(evento: any): void {
    const docId = evento.value;
    const doc = this.paquetesZip().find(d => d.id === docId);
    if (!doc) return;

    this.isLoadingZip.set(true);
    this.imagenesZip.set([]);
    this.slotActivo.set(null); 
    this.cdr.detectChanges();

    this.informeForm.patchValue({
      numeroAtm: doc.numeroAtm || '',
      banco: doc.banco || ''
    });

    this.bibliotecaService.obtenerBlobParaExplorar(doc.id).subscribe({
      next: async (blob: Blob) => {
        try {
          const zip = await JSZip.loadAsync(blob);
          const tempImgs: ImagenExtraida[] = [];
          const promesas: Promise<void>[] = [];

          zip.forEach((pathFile, fileObj) => {
            const ext = pathFile.toLowerCase().split('.').pop() || '';
            const esFirma = pathFile.toLowerCase().includes('firma') || pathFile.toLowerCase().startsWith('firmas/');

            if (!fileObj.dir && ['png', 'jpg', 'jpeg'].includes(ext) && !esFirma) {
              const p = fileObj.async('base64').then((b64) => {
                const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
                tempImgs.push({
                  nombre: pathFile.replace('fotos/', ''), 
                  base64: `data:${mime};base64,${b64}`
                });
              });
              promesas.push(p);
            }
          });

          await Promise.all(promesas);
          this.imagenesZip.set(tempImgs);

          const pdfFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.pdf'));
          if (pdfFiles.length > 0) {
            const pdfName = pdfFiles[0];
            const pdfBuffer = await zip.files[pdfName].async('arraybuffer');
            await this.convertirPdfAOtgJpg(pdfBuffer);
          }

          this.isLoadingZip.set(false);
          this.cdr.detectChanges();
        } catch (e) {
          alert('Error decodificando las fotografías del ZIP comprimido.');
          this.isLoadingZip.set(false);
          this.cdr.detectChanges();
        }
      },
      error: () => {
        alert('Fallo recuperando documento zip.');
        this.isLoadingZip.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  async convertirPdfAOtgJpg(pdfBuffer: ArrayBuffer) {
    try {
      const loadingPdf = pdfjsLib.getDocument({ data: pdfBuffer });
      const pdf = await loadingPdf.promise;
      const pagina = await pdf.getPage(1);
      const viewport = pagina.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const contexto = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (contexto) {
        await pagina.render({ 
          canvasContext: contexto, 
          viewport: viewport,
          canvas: canvas
        } as any).promise;
        const base64OtJpg = canvas.toDataURL('image/jpeg', 0.85);

        this.previsualizacionOt.set(base64OtJpg);
        this.informeForm.patchValue({ otImgBase64: base64OtJpg });
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.warn("No se pudo extraer la carátula del PDF de forma automática.");
    }
  }

  // 🌟 Acción de Miniatura Lateral: Sólamente abre Vista Previa Ampliada (No asigna nada)
  abrirVistaPreviaLateral(img: ImagenExtraida): void {
    this.fotoPrevisualizar.set(img);
    this.cdr.detectChanges();
  }

  cerrarVistaPrevia(): void {
    this.fotoPrevisualizar.set(null);
    this.cdr.detectChanges();
  }

  // 🌟 Acción "Asociar Foto" en Tarjeta: Abre el Diálogo Modal
  abrirModalDeSeleccion(idxForm: number): void {
    if (this.imagenesZip().length === 0) {
      alert("Por favor, selecciona primero un paquete ZIP origen de terreno (Sección 1) para disponer de fotografías.");
      return;
    }
    this.slotActivo.set(idxForm);
    this.mostrarModalSeleccion.set(true);
    this.cdr.detectChanges();
  }

  cerrarModalDeSeleccion(): void {
    this.mostrarModalSeleccion.set(false);
    this.slotActivo.set(null);
    this.cdr.detectChanges();
  }

  // Acción al seleccionar una foto dentro de la ventana modal
  seleccionarFotoDesdeModal(img: ImagenExtraida): void {
    const idx = this.slotActivo();
    if (idx !== null) {
      this.fotosAsignadas.at(idx).patchValue({
        imagen_base64: img.base64
      });
    }
    this.cerrarModalDeSeleccion();
  }

  limpiarFotoSeccion(idxForm: number): void {
    this.fotosAsignadas.at(idxForm).patchValue({
      imagen_base64: null
    });
    this.cdr.detectChanges();
  }

  enviarInforme(): void {
    if (this.informeForm.invalid) {
      alert('Valide todos los campos requeridos en la plantilla antes de continuar.');
      return;
    }

    this.isGenerating.set(true);
    this.cdr.detectChanges();
    const formVals = this.informeForm.value;

    const payload = {
      numeroAtm: formVals.numeroAtm,
      banco: formVals.banco,
      tipoSolicitud: formVals.tipoSolicitud,
      comentarioGeneral: formVals.comentarioGeneral,
      formato: formVals.formato,
      clienteLogoBase64: formVals.clienteLogoBase64,
      servicioImgBase64: formVals.servicioImgBase64,
      otImgBase64: formVals.otImgBase64,
      detalleTecnico: formVals.pasosDetalle,
      fotosAsignadas: formVals.fotosAsignadas
    };

    const token = localStorage.getItem('token');
    
    this.http.post('http://localhost:8000/biblioteca/generar-informe-completo', payload, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `INFORME_COMPLETO_${formVals.numeroAtm}.${formVals.formato}`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.isGenerating.set(false);
        this.cdr.detectChanges();
        alert('Informe exportado exitosamente y registrado en la biblioteca.');
      },
      error: (err) => {
        console.error(err);
        this.isGenerating.set(false);
        this.cdr.detectChanges();
        alert('Fallo en el motor de reportes al componer la plantilla.');
      }
    });
  }
}