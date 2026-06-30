import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OtService } from '../../core/services/ot.service';
import { OtTrabajo, OtEstado, OT_ESTADO_LABELS, OT_ESTADO_COLORS } from '../../core/models/ot.model';

@Component({
  selector: 'app-ot-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatDividerModule, MatProgressSpinnerModule,
    MatSelectModule, MatFormFieldModule, MatSnackBarModule
  ],
  templateUrl: './ot-detalle.component.html',
  styleUrl: './ot-detalle.component.scss'
})
export class OtDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OtService);
  private snackBar = inject(MatSnackBar);

  ot: OtTrabajo | null = null;
  loading = true;
  cambiandoEstado = false;
  nuevoEstado: OtEstado | '' = '';

  readonly estados: Array<{ value: OtEstado; label: string }> = [
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_progreso', label: 'En progreso' },
    { value: 'pendiente_envio', label: 'Pendiente envío' },
    { value: 'sincronizado', label: 'Sincronizado' },
  ];

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.otService.obtener(id).subscribe({
      next: (ot) => { this.ot = ot; this.nuevoEstado = ot.estado; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  aplicarEstado() {
    if (!this.ot || !this.nuevoEstado) return;
    this.cambiandoEstado = true;
    this.otService.cambiarEstado(this.ot.id, this.nuevoEstado as OtEstado).subscribe({
      next: (ot) => {
        this.ot = ot;
        this.nuevoEstado = ot.estado;
        this.cambiandoEstado = false;
        this.snackBar.open('Estado actualizado', 'OK', { duration: 3000 });
      },
      error: () => {
        this.cambiandoEstado = false;
        this.snackBar.open('Error al actualizar estado', 'OK', { duration: 3000 });
      }
    });
  }

  eliminar() {
    if (!this.ot || !confirm(`¿Eliminar OT #${this.ot.id}?`)) return;
    this.otService.eliminar(this.ot.id).subscribe({
      next: () => {
        this.snackBar.open('OT eliminada', 'OK', { duration: 3000 });
        this.router.navigate(['/ots']);
      }
    });
  }

  estadoLabel(e: OtEstado) { return OT_ESTADO_LABELS[e]; }
  estadoColor(e: OtEstado) { return OT_ESTADO_COLORS[e]; }
}
