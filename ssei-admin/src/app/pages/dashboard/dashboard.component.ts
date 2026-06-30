import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OtService } from '../../core/services/ot.service';
import { OtTrabajo, OtEstado, OT_ESTADO_LABELS, OT_ESTADO_COLORS } from '../../core/models/ot.model';

interface KpiCard {
  estado: OtEstado;
  label: string;
  count: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private otService = inject(OtService);

  loading = true;
  ots: OtTrabajo[] = [];
  kpis: KpiCard[] = [];

  readonly estadoIcons: Record<OtEstado, string> = {
    asignado: 'assignment_ind',
    en_progreso: 'build',
    pendiente_envio: 'cloud_upload',
    sincronizado: 'check_circle',
  };

  ngOnInit() {
    this.otService.listar().subscribe({
      next: (ots) => {
        this.ots = ots;
        this.buildKpis(ots);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private buildKpis(ots: OtTrabajo[]) {
    const estados: OtEstado[] = ['asignado', 'en_progreso', 'pendiente_envio', 'sincronizado'];
    this.kpis = estados.map(estado => ({
      estado,
      label: OT_ESTADO_LABELS[estado],
      count: ots.filter(o => o.estado === estado).length,
      color: OT_ESTADO_COLORS[estado],
      icon: this.estadoIcons[estado]
    }));
  }

  get recientes(): OtTrabajo[] {
    return [...this.ots]
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 5);
  }

  estadoLabel(e: OtEstado) { return OT_ESTADO_LABELS[e]; }
  estadoColor(e: OtEstado) { return OT_ESTADO_COLORS[e]; }

  atmLabels(ot: OtTrabajo): string {
    return ot.atms.map(a => a.numero_atm || a.etiqueta).filter(Boolean).join(', ') || '—';
  }
}
