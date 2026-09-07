import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Documento } from '../../core/models/documento.model';
import JSZip from 'jszip';

@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule
  ],
  templateUrl: './biblioteca.component.html',
  styleUrls: ['./biblioteca.component.scss']
})
export class BibliotecaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bibliotecaService = inject(BibliotecaService);
  protected authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // Signal para clasificar la vista principal de la Biblioteca: 'documentacion' | 'respaldos' | 'todos'
  filtroSeccion = signal<string>('todos');

  // Signals reactivos
  documentos = signal<Documento[]>([]);
  papelera = signal<Documento[]>([]);
  isLoading = signal<boolean>(false);
  isUploading = signal<boolean>(false);

  // Archivo seleccionado listo para subir
  archivoSeleccionado: File | null = null;

  // Variables para filtros de visualización interactiva (Tu Visión de Negocio)
  filtroTexto = signal<string>('');
  filtroBanco = signal<string>('todos');
  filtroCategoria = signal<string>('todas');

  // Formulario reactivo de subida
  uploadForm: FormGroup = this.fb.group({
    categoria: ['manuales', Validators.required],
    banco: [''],
    numeroAtm: ['']
  });

  // Lista de bancos registrados para los selectores/filtros del frontend
  bancosDisponibles: string[] = ['Banco de Chile', 'Banco Santander', 'Banco Estado', 'BCI', 'Scotiabank', 'Itaú'];

  displayedColumns: string[] = ['archivo', 'categoria', 'banco', 'numeroAtm', 'peso', 'createdAt', 'actions'];
  papeleraColumns: string[] = ['archivo', 'categoria', 'peso', 'deletedAt', 'actions'];

  // Signals para el visor del contenido ZIP
  archivosZipAbierto = signal<{ nombre: string; dataUrl?: string; tipo: 'imagen' | 'pdf' | 'otro' }[]>([]);
  zipCargando = signal<boolean>(false);
  documentoZipSeleccionado = signal<Documento | null>(null);
  mostrarModalZip = signal<boolean>(false);

  // Metodo para explorar el paquete ZIP con tipados correctos para JSZip
  explorarPaqueteZip(doc: Documento): void {
    this.documentoZipSeleccionado.set(doc);
    this.zipCargando.set(true);
    this.mostrarModalZip.set(true);
    this.archivosZipAbierto.set([]);

    // Descargamos el binario para decodificarlo localmente
    this.bibliotecaService.obtenerBlobParaExplorar(doc.id).subscribe({
      next: async (blob: Blob) => {
        try {
          const zip = await JSZip.loadAsync(blob);
          const listaArchivos: { nombre: string; tipo: 'imagen' | 'pdf' | 'otro' }[] = [];

          // Solución a TS7006: Tipado explícito de relativePath (string) y file (JSZip.JSZipObject)
          zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
            if (!file.dir) {
              const ext = relativePath.toLowerCase().split('.').pop() || '';
              const tipo = ['jpg', 'jpeg', 'png', 'gif'].includes(ext) ? 'imagen'
                : ext === 'pdf' ? 'pdf'
                  : 'otro';

              listaArchivos.push({
                nombre: relativePath,
                tipo: tipo as 'imagen' | 'pdf' | 'otro'
              });
            }
          });

          this.archivosZipAbierto.set(listaArchivos);
          this.zipCargando.set(false);
        } catch (err) {
          this.zipCargando.set(false);
          this.mostrarMensaje('No se pudo leer la estructura del paquete ZIP.', true);
        }
      },
      error: () => {
        this.zipCargando.set(false);
        this.mostrarMensaje('Fallo al recuperar el archivo del servidor.', true);
      }
    });
  }

  cerrarVisorZip(): void {
    this.mostrarModalZip.set(false);
    this.documentoZipSeleccionado.set(null);
    this.archivosZipAbierto.set([]);
  }

  // Computado Reactivo: Buscador iterativo inteligente de alta velocidad
  documentosFiltrados = computed(() => {
    let list = this.documentos();
    const texto = this.filtroTexto().toLowerCase().trim();
    const banco = this.filtroBanco();
    const categoria = this.filtroCategoria();
    const seccion = this.filtroSeccion();

    // 1. Filtrar por tipo de sección (Segmentación Principal)
    if (seccion === 'documentacion') {
      // Manuales, planos y procedimientos operativos estáticos
      const catsDoc = ['manuales', 'planos', 'procedimientos'];
      list = list.filter(d => catsDoc.includes(d.categoria));
    } else if (seccion === 'respaldos') {
      // Categorías de trabajo en terreno provenientes de la app-mobile
      const catsDoc = ['manuales', 'planos', 'procedimientos'];
      list = list.filter(d => !catsDoc.includes(d.categoria));
    }

    // 2. Filtrar por término de búsqueda (nombre original o número de ATM o categorización)
    if (texto) {
      list = list.filter(d =>
        d.nombreOriginal.toLowerCase().includes(texto) ||
        (d.numeroAtm && d.numeroAtm.toLowerCase().includes(texto)) ||
        this.obtenerNombreCategoria(d.categoria).toLowerCase().includes(texto)
      );
    }

    // 3. Filtrar por Banco/Cliente
    if (banco !== 'todos') {
      list = list.filter(d => d.banco === banco);
    }

    // 4. Filtrar por Categoría específica
    if (categoria !== 'todas') {
      list = list.filter(d => d.categoria === categoria);
    }

    return list;
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading.set(true);
    this.bibliotecaService.listarDocumentos().subscribe({
      next: (docs) => {
        this.documentos.set(docs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.mostrarMensaje('Error al obtener los documentos de la biblioteca', true);
      }
    });

    // Si es Administrador, cargamos también la papelera de reciclaje de respaldo
    if (this.authService.hasRole(['admin'])) {
      this.bibliotecaService.listarPapelera().subscribe({
        next: (trash) => this.papelera.set(trash)
      });
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
    }
  }

  onUpload(): void {
    if (!this.archivoSeleccionado || this.uploadForm.invalid) {
      return;
    }

    this.isUploading.set(true);
    const { categoria, banco, numeroAtm } = this.uploadForm.value;

    this.bibliotecaService.subirDocumento(
      this.archivoSeleccionado,
      categoria,
      banco || null,
      numeroAtm || null
    ).subscribe({
      next: (nuevoDoc) => {
        this.documentos.update(list => [nuevoDoc, ...list]);
        this.archivoSeleccionado = null;
        this.uploadForm.reset({ categoria: 'manuales' });
        this.isUploading.set(false);
        this.mostrarMensaje('¡Documento digital subido exitosamente!');

        // Limpiamos el input file de la vista
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err) => {
        this.isUploading.set(false);
        this.mostrarMensaje(err.error?.detail || 'Error al intentar subir el archivo.', true);
      }
    });
  }

  descargar(doc: Documento): void {
    this.bibliotecaService.descargarDocumento(doc);
  }

  moverTrash(doc: Documento): void {
    if (!confirm(`¿Está seguro de enviar "${doc.nombreOriginal}" a la Papelera de Reciclaje? Quedará resguardado por 30 días.`)) {
      return;
    }

    this.bibliotecaService.moverAPapelera(doc.id).subscribe({
      next: (movido) => {
        this.documentos.update(list => list.filter(d => d.id !== doc.id));
        this.papelera.update(list => [movido, ...list]);
        this.mostrarMensaje('Documento enviado a la Papelera de Reciclaje.');
      },
      error: () => this.mostrarMensaje('No se pudo enviar el documento a la papelera', true)
    });
  }

  esCategoriaRespaldo = computed(() => {
    const catSeleccionada = this.uploadForm.get('categoria')?.value;
    // Categorías que representan trabajos reales de la app mobile
    const categoriasTerreno = ['instalacion', 'desanclaje', 'movimientointerno', 'transporte', 'servicioelectrico', 'serviciotecnico', 'grafica'];
    return categoriasTerreno.includes(catSeleccionada);
  });

  restaurar(doc: Documento): void {
    this.bibliotecaService.restaurarDePapelera(doc.id).subscribe({
      next: (restaurado) => {
        this.papelera.update(list => list.filter(d => d.id !== doc.id));
        this.documentos.update(list => [restaurado, ...list]);
        this.mostrarMensaje('Documento restaurado con éxito a la biblioteca.');
      },
      error: () => this.mostrarMensaje('No se pudo restaurar el documento', true)
    });
  }

  // Helper interactivo para formatear peso de bytes a un texto legible
  formatearPeso(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Traducción lógica en el cliente del nombre de categorías
  obtenerNombreCategoria(cat: string): string {
    const nombres: { [key: string]: string } = {
      // Segmento A: Documentación Técnica de Referencia
      manuales: 'Manual Técnico',
      planos: 'Planos de Cajero (ATM)',
      procedimientos: 'Procedimiento Operativo',

      // Segmento B: Respaldos de Trabajos (App Mobile OT)
      instalacion: 'Ficha de Instalación',
      desanclaje: 'Ficha de Desanclaje',
      movimientointerno: 'Movimiento Interno',
      transporte: 'Guía de Transporte',
      servicioelectrico: 'Servicio Eléctrico (Mediciones)',
      serviciotecnico: 'Ficha de Servicio Técnico',
      grafica: 'Instalación Gráfica',
      pintura: 'Trabajos de Pintura',
      asistencia: 'Asistencia en Terreno',

      // Genérico
      otros: 'Otros Documentos'

    };
    const mapeo: { [key: string]: string } = {
      'manuales': 'Manuales y Guias',
      'planos': 'Planos Técnicos',
      'procedimientos': 'Procedimiento Operativo',
      'respaldo_terreno': 'Respaldo Fotográfico Movil',
      'informes': 'Informe Técnico Editado' // <-- Agrega esta línea
    };
    return mapeo[cat] || cat;
  }

  private mostrarMensaje(mensaje: string, isError: boolean = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: isError ? ['error-snackbar'] : []
    });
  }
}