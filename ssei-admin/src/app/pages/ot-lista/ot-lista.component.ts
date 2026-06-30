import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OtService } from '../../core/services/ot.service';
import { OtTrabajo, OtEstado, OT_ESTADO_LABELS, OT_ESTADO_COLORS } from '../../core/models/ot.model';

@Component({
  selector: 'app-ot-lista',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatInputModule, MatFormFieldModule,
    MatChipsModule, MatProgressSpinnerModule,
    MatDialogModule, MatSnackBarModule, MatTooltipModule
  ],
  templateUrl: './ot-lista.component.html',
  styleUrl: './ot-lista.component.scss'
})
export class OtListaComponent implements OnInit {
  private otService = inject(OtService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['id', 'cliente', 'atms', 'nombre_tecnico', 'estado', 'fecha_creacion', 'acciones'];
  dataSource = new MatTableDataSource<OtTrabajo>([]);
  loading = true;

  filtroTexto = '';
  filtroEstado: OtEstado | '' = '';

  readonly estados: Array<{ value: OtEstado | ''; label: string }> = [
    { value: '', label: 'Todos los estados' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_progreso', label: 'En progreso' },
    { value: 'pendiente_envio', label: 'Pendiente envío' },
    { value: 'sincronizado', label: 'Sincronizado' },
  ];

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading = true;
    this.otService.listar().subscribe({
      next: (ots) => {
        this.dataSource.data = ots;
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.dataSource.filterPredicate = (ot, f) => {
          const [texto, estado] = f.split('||');
          const matchTexto = !texto || [ot.cliente, ot.nombre_tecnico, ot.comuna, ...ot.atms.map(a => a.numero_atm)]
            .join(' ').toLowerCase().includes(texto);
          const matchEstado = !estado || ot.estado === estado;
          return matchTexto && matchEstado;
        };
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  aplicarFiltro() {
    this.dataSource.filter = `${this.filtroTexto.trim().toLowerCase()}||${this.filtroEstado}`;
  }

  limpiarFiltros() {
    this.filtroTexto = '';
    this.filtroEstado = '';
    this.dataSource.filter = '';
  }

  eliminar(ot: OtTrabajo) {
    if (!confirm(`¿Eliminar OT #${ot.id} (${ot.cliente})?`)) return;
    this.otService.eliminar(ot.id).subscribe({
      next: () => {
        this.snackBar.open('OT eliminada', 'OK', { duration: 3000 });
        this.cargar();
      },
      error: () => this.snackBar.open('Error al eliminar', 'OK', { duration: 3000 })
    });
  }

  estadoLabel(e: OtEstado) { return OT_ESTADO_LABELS[e]; }
  estadoColor(e: OtEstado) { return OT_ESTADO_COLORS[e]; }

  atmLabels(ot: OtTrabajo): string {
    return ot.atms.map(a => a.numero_atm || a.etiqueta).filter(Boolean).join(', ') || '—';
  }
}
