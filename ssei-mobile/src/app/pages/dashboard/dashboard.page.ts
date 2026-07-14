import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { addIcons } from 'ionicons';
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
  ) {
    addIcons({ addOutline, syncOutline, wifiOutline, shieldCheckmarkOutline, listOutline });
  }

  ionViewWillEnter(): void {
    this.workOrders = this.otContextService.getTrabatos();
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