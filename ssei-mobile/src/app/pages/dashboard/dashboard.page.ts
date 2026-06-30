import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { syncOutline, wifiOutline, addOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonFooter
} from '@ionic/angular/standalone';
import { OtContextService, OtTrabajo, OtEstado } from '../../ot-context.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonFab,
    IonFabButton,
    IonFooter,
  ]
})
export class DashboardPage {
  workOrders: OtTrabajo[] = [];

  constructor(
    private readonly otContextService: OtContextService,
    private readonly router: Router,
  ) {
    addIcons({ addOutline, syncOutline, wifiOutline, shieldCheckmarkOutline });
  }

  ionViewWillEnter(): void {
    this.workOrders = this.otContextService.getTrabatos();
  }

  get pendingCount(): number {
    return this.workOrders.filter(x => x.estado !== 'sincronizado').length;
  }

  get syncedCount(): number {
    return this.workOrders.filter(x => x.estado === 'sincronizado').length;
  }

  badgeColor(estado: OtEstado): string {
    const colores: Record<OtEstado, string> = {
      asignado: 'warning',
      en_progreso: 'primary',
      pendiente_envio: 'danger',
      sincronizado: 'success',
    };
    return colores[estado];
  }

  badgeLabel(estado: OtEstado): string {
    const etiquetas: Record<OtEstado, string> = {
      asignado: 'Asignado',
      en_progreso: 'En Progreso',
      pendiente_envio: 'Pendiente Envío',
      sincronizado: 'Sincronizado',
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

