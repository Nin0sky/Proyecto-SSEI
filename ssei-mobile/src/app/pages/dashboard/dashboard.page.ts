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
      next: (ots: any[]) => {
        // 1. Mapeamos las OTs que traemos del Servidor
        const otsMapeadas: OtTrabajo[] = ots.map((ot: any) => {
          return {
            id: ot.id.toString(),
            cliente: ot.banco,
            estado: this.mapearEstadoServidor(ot.estado),
            comuna: ot.comuna,
            direccion: ot.direccion,
            origenServidor: true,
            ubicacion: ot.ubicacion || '',
            fotos: [],
            fechaCreacion: ot.fecha_creacion,
            // Procesamos los ATMs de cada orden para la visualización del técnico
            atms: ot.atms ? ot.atms.map((a: any) => {
              // Normalizamos el tipo de servicio (Ej: "Servicio Tecnico" -> "serviciotecnico")
              const tipoNormalizado = (a.tipo_servicio ?? '')
                .toString()
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '');

              return {
                etiqueta: a.etiqueta || 'ATM 1',
                tipoServicio: tipoNormalizado,
                numeroAtm: a.numero_atm || '',
                serieCajero: a.serie_cajero || '',
                serieMmbb: a.serie_mmbb || '',
                detallesServicio: a.detalles_servicio || '',
                observaciones: a.observaciones || ''
              };
            }) : []
          };
        });

        // 2. Sincronizamos las OTs mapeadas en el Contexto Local
        // Reemplazar o añadir las órdenes descargadas en la caché para no duplicar ni perder avances
        otsMapeadas.forEach(otServidor => {
          const indexIndex = this.otContextService.trabajos.findIndex(t => t.id === otServidor.id);
          if (indexIndex !== -1) {
            const localOt = this.otContextService.trabajos[indexIndex];
            // Si la OT local ya se empezó a editar ('en_progreso'), conservamos los cambios locales
            if (localOt.estado !== 'asignado') {
              otServidor.estado = localOt.estado;
              otServidor.atms = localOt.atms;
              otServidor.fotos = localOt.fotos;
              otServidor.nombreTecnico = localOt.nombreTecnico;
              otServidor.nombreETV = localOt.nombreETV;
              otServidor.nombreAlarma = localOt.nombreAlarma;
            }
            this.otContextService.trabajos[indexIndex] = otServidor;
          } else {
            this.otContextService.trabajos.push(otServidor);
          }
        });

        // Guardamos los trabajos en el localStorage de la app
        this.otContextService.setAtms(this.otContextService.atms);

        // 3. Mostramos las órdenes del técnico en la interfaz
        this.workOrders = otsMapeadas;
      },
      error: (err: any) => {
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