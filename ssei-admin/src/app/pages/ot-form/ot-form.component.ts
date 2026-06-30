import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OtService } from '../../core/services/ot.service';
import { OtTrabajo, OtEstado } from '../../core/models/ot.model';

@Component({
  selector: 'app-ot-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatCheckboxModule, MatDividerModule,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './ot-form.component.html',
  styleUrl: './ot-form.component.scss'
})
export class OtFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OtService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  loading = false;
  loadingOt = false;
  editando = false;
  otId?: number;

  readonly clientes = ['Banco de Chile', 'Banco Estado', 'Santander', 'BCI', 'Itaú', 'BICE', 'Scotiabank'];
  readonly tiposServicio = ['Preventivo', 'Correctivo', 'Instalación', 'Retiro', 'Actualización'];
  readonly estados: Array<{ value: OtEstado; label: string }> = [
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_progreso', label: 'En progreso' },
    { value: 'pendiente_envio', label: 'Pendiente envío' },
    { value: 'sincronizado', label: 'Sincronizado' },
  ];

  ngOnInit() {
    this.form = this.fb.group({
      cliente: ['', Validators.required],
      estado: ['asignado', Validators.required],
      comuna: [''],
      direccion: [''],
      nombre_tecnico: [''],
      nombre_etv: [''],
      nombre_alarma: [''],
      origen_servidor: [false],
      atms: this.fb.array([])
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
    } else {
      this.agregarAtm();
    }
  }

  get atms(): FormArray { return this.form.get('atms') as FormArray; }

  private atmGroup(data?: Partial<OtTrabajo['atms'][0]>) {
    return this.fb.group({
      etiqueta: [data?.etiqueta ?? `ATM ${this.atms.length + 1}`],
      tipo_servicio: [data?.tipo_servicio ?? ''],
      numero_atm: [data?.numero_atm ?? ''],
      serie_cajero: [data?.serie_cajero ?? ''],
      serie_mmbb: [data?.serie_mmbb ?? ''],
      detalles_servicio: [data?.detalles_servicio ?? ''],
      observaciones: [data?.observaciones ?? '']
    });
  }

  agregarAtm() { this.atms.push(this.atmGroup()); }
  eliminarAtm(i: number) { if (this.atms.length > 1) this.atms.removeAt(i); }

  private cargarOt(ot: OtTrabajo) {
    this.form.patchValue({
      cliente: ot.cliente,
      estado: ot.estado,
      comuna: ot.comuna,
      direccion: ot.direccion,
      nombre_tecnico: ot.nombre_tecnico,
      nombre_etv: ot.nombre_etv,
      nombre_alarma: ot.nombre_alarma,
      origen_servidor: ot.origen_servidor
    });
    while (this.atms.length) this.atms.removeAt(0);
    if (ot.atms.length === 0) {
      this.agregarAtm();
    } else {
      ot.atms.forEach(a => this.atms.push(this.atmGroup(a)));
    }
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const data = this.form.value;

    const op = this.editando && this.otId
      ? this.otService.actualizar(this.otId, data)
      : this.otService.crear(data);

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
