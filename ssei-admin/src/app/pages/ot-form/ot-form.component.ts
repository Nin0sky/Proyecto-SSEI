import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OtService } from '../../core/services/ot.service';
import { OtTrabajo, OtCreate, OtEstado, Region } from '../../core/models/ot.model';

@Component({
  selector: 'app-ot-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    MatTimepickerModule, MatDatepickerModule, FormsModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './ot-form.component.html',
  styleUrl: './ot-form.component.scss'
})
export class OtFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OtService);
  private snackBar = inject(MatSnackBar);

  value!: Date;

  form!: FormGroup;
  loading = false;
  loadingOt = false;
  editando = false;
  otId?: number;

  readonly bancos = ['Banco de Chile', 'Banco Estado', 'Loomis', 'Banco Santander', 'Banco BCI', 'Banco Itaú', 'Banco Falabella', 'Banco Edwards', 'Scotiabank'];
  readonly tecnicos = [
    { id: 1, nombre: 'Rodolfo Carreño' },
    { id: 2, nombre: 'Juan Albornoz' },
    { id: 3, nombre: 'Pedro Berrios' },
  ];
  region: Region[] = []; // <-- Cambiado de readonly estático a dinámico

  readonly tiposServicio = ['Servicio Tecnico', 'Servicio Electrico', 'Instalación de ATM', 'Retiro de ATM', 'Grafica', 'Desratizacion', 'SPA ATM', 'Anclaje', 'Desanclaje'];
  readonly estados: Array<{ value: OtEstado; label: string }> = [
    { value: 'creada', label: 'Creada' },
    { value: 'asignada', label: 'Asignada' },
    { value: 'en_progreso', label: 'En progreso' },
    { value: 'pendiente_envio', label: 'Pendiente envío' },
    { value: 'sincronizada', label: 'Sincronizada' },
    { value: 'cerrada', label: 'Cerrada' },
  ];

  ngOnInit() {
    this.form = this.fb.group({
      banco: ['', Validators.required],
      numero_atm: ['', Validators.required],
      tipo_servicio: ['', Validators.required],
      fecha_programada: [null, Validators.required],
      hora_programada_time: [null, Validators.required],
      tecnico_id: [null, [Validators.required, Validators.min(1)]],
      comuna: [''],
      ubicacion: [''],
      direccion: ['', [Validators.required, Validators.minLength(3)]],
      region: [null, Validators.required] // Asegúrate de tenerlo validado en el controlador si lo deseas
    });

    // Cargar regiones desde el backend
    this.otService.listarRegiones().subscribe({
      next: (data) => this.region = data,
      error: () => this.snackBar.open('Error al cargar las regiones', 'OK', { duration: 3000 })
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nueva') {
      this.editando = true;
      this.otId = Number(id);
      this.loadingOt = true;
      this.otService.obtener(this.otId).subscribe({
        next: (ot) => { this.cargarOt(ot); this.loadingOt = false; },
        error: () => { this.loadingOt = false; }
      });
    }
  }

  private cargarOt(ot: OtTrabajo) {
    const parsedDate = ot.hora_programada ? new Date(ot.hora_programada) : null;
    const primerAtm = ot.atms && ot.atms.length > 0 ? ot.atms[0] : null;

    this.form.patchValue({
      banco: ot.banco,
      numero_atm: primerAtm ? primerAtm.numero_atm : '',
      tipo_servicio: primerAtm ? primerAtm.tipo_servicio : '',
      fecha_programada: parsedDate,
      hora_programada_time: parsedDate,
      tecnico_id: ot.tecnico_id,
      comuna: ot.comuna,
      direccion: ot.direccion,
      ubicacion: primerAtm ? primerAtm.ubicacion : '', 
    });
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const data = this.form.getRawValue();
    const regionSeleccionada = this.region.find(r => r.id === Number(data.region));
    const regionNombre = regionSeleccionada ? regionSeleccionada.nombre : '';

    // Procesar y combinar fecha y hora para la API
    let horaProgramadaStr = '';
    if (data.fecha_programada instanceof Date && data.hora_programada_time instanceof Date) {
      const combinedDate = new Date(data.fecha_programada);
      combinedDate.setHours(
        data.hora_programada_time.getHours(),
        data.hora_programada_time.getMinutes(),
        0,
        0
      );

      const pad = (n: number) => String(n).padStart(2, '0');
      // Produce una cadena en formato local "YYYY-MM-DDTHH:MM:SS"
      horaProgramadaStr = `${combinedDate.getFullYear()}-${pad(combinedDate.getMonth() + 1)}-${pad(combinedDate.getDate())}T${pad(combinedDate.getHours())}:${pad(combinedDate.getMinutes())}:00`;
    }

    // Adaptamos el payload plano al esquema de OtCreate esperado por el Backend
    const payload: OtCreate = {
      banco: data.banco,
      hora_programada: horaProgramadaStr,
      tecnico_id: Number(data.tecnico_id),
      comuna: data.comuna ?? '',
      direccion: data.direccion,
      nombre_tecnico: '',
      nombre_etv: '',
      ubicacion: '',
      region: regionNombre,
      atms: [
        {
          etiqueta: 'ATM 1',
          numero_atm: data.numero_atm,
          tipo_servicio: data.tipo_servicio,
          serie_cajero: '',
          serie_mmbb: '',
          detalles_servicio: '',
          observaciones: '',
          ubicacion: '',
        }
      ],
    };

    const op = this.editando && this.otId
      ? this.otService.actualizar(this.otId, payload)
      : this.otService.crear(payload);

    op.subscribe({
      next: (ot) => {
        this.loading = false;
        this.snackBar.open(this.editando ? 'OT actualizada' : 'OT creada', 'OK', { duration: 3000 });
        this.router.navigate(['/ots', ot.id]);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al guardar la OT', 'OK', { duration: 3000 });
      }
    });
  }
}