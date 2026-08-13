import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { AuthService } from '../../services/auth.service';
import { syncOutline, wifiOutline, addOutline, shieldCheckmarkOutline, listOutline } from 'ionicons/icons';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonCard, IonCardContent, IonList, IonItem, IonLabel,
  IonBadge, IonFab, IonFabButton, IonFooter, IonImg,
} from '@ionic/angular/standalone';
import { OtContextService, OtTrabajo, OtEstado } from '../../ot-context.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons,
    IonButton, IonIcon, IonContent, IonCard, IonCardContent, IonList,
    IonItem, IonLabel, IonBadge, IonFab, IonFabButton, IonFooter, IonImg,
  ]
})
export class DashboardPage {
  workOrders: OtTrabajo[] = [];
  filtroEstado: OtEstado | null = null;

  constructor(
    private readonly otContextService: OtContextService,
    private readonly router: Router,
    private readonly authService: AuthService, // Inyectar el servicio AuthService
  ) {
    addIcons({ addOutline, syncOutline, wifiOutline, shieldCheckmarkOutline, listOutline });
  }

  ionViewWillEnter(): void {
    this.authService.obtenerOtsServidor().subscribe({
      next: (ots: any[]) => { // ✔️ Corregido: Tipado explícito de ots
        // Mapeamos los datos de snake_case (FastAPI) a camelCase (Ionic) segun copilot-instructions.md
        this.workOrders = ots.map((ot: any) => ({ // ✔️ Corregido: Tipado explícito de ot Enlace al modelo
          id: ot.id.toString(),
          cliente: ot.banco,
          estado: this.mapearEstadoServidor(ot.estado), // ✔️ Corregido: Mapeo de estados estrictos
          comuna: ot.comuna,
          direccion: ot.direccion,
          atms: ot.atms.map((a: any) => ({
            etiqueta: a.etiqueta,
            tipoServicio: a.tipo_servicio,
            numeroAtm: a.numero_atm,
            serieCajero: a.serie_cajero,
            serieMmbb: a.serie_mmbb,
            detallesServicio: a.detalles_servicio,
            observaciones: a.observaciones
          })),
          fotos: [],
          fechaCreacion: ot.fecha_creacion,
          origenServidor: true,
          ubicacion: ''
        }));
      },
      error: (err: any) => { // ✔️ Corregido: Tipado explícito del error
        console.error('Error al sincronizar OTs con el servidor:', err);
      }
    });
  }

  // Método auxiliar para evitar incompatibilidad de tipos entre la base de datos (FastAPI) y la App Móvil:
  private mapearEstadoServidor(estadoServidor: string): OtEstado {
    const mapa: Record<string, OtEstado> = {
      'creada': 'asignado',
      'asignada': 'asignado',
      'en_progreso': 'en_progreso',
      'pendiente_envio': 'pendiente_envio',
      'sincronizada': 'sincronizado',
      'cerrada': 'sincronizado'
    };
    return mapa[estadoServidor] || 'asignado';
  }

  get filteredWorkOrders(): OtTrabajo[] {
    if (!this.filtroEstado) return this.workOrders;
    return this.workOrders.filter(ot => ot.estado === this.filtroEstado);
  }

  get pendingCount(): number {
    return this.workOrders.filter(x => x.estado !== 'sincronizado').length;
  }

  get syncedCount(): number {
    return this.workOrders.filter(x => x.estado === 'sincronizado').length;
  }

  filtroVisible = false;
  toggleFiltro(): void {
    this.filtroVisible = !this.filtroVisible;
  }

  seleccionarFiltro(estado: OtEstado | null): void {
    this.filtroEstado = estado;
    this.filtroVisible = false;
  }

  badgeColor(estado: OtEstado): string {
    const colores: Record<OtEstado, string> = {
      asignado: 'warning', en_progreso: 'primary',
      pendiente_envio: 'danger', sincronizado: 'success',
    };
    return colores[estado];
  }

  badgeLabel(estado: OtEstado): string {
    const etiquetas: Record<OtEstado, string> = {
      asignado: 'Asignado', en_progreso: 'En Progreso',
      pendiente_envio: 'Pendiente Envío', sincronizado: 'Sincronizado',
    };
    return etiquetas[estado];
  }

  abrirTrabajo(id: string): void {
    this.otContextService.cargarTrabajo(id);
    this.router.navigate(['/registro-otubi']);
  }

  nuevoTrabajo(): void {
    this.otContextService.crearTrabajo();
    this.router.navigate(['/registro-otubi']);
  }

  tituloTrabajo(ot: OtTrabajo): string {
    const numeros = ot.atms.map(a => a.numeroAtm.trim()).filter(n => n.length > 0);
    if (numeros.length > 0) {
      return numeros.length === 1 ? `ATM ${numeros[0]}` : `[${numeros.join('-')}]`;
    }
    return ot.id.startsWith('local-') ? 'Nuevo trabajo' : `#${ot.id}`;
  }
}