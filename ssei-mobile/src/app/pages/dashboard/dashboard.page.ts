import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

interface WorkOrder {
  id: number;
  atm: string;
  bank: string;
  location: string;
  synced: boolean;
}

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
  workOrders: WorkOrder[] = [
    { id: 1024, atm: 'ATM 6122', bank: 'Banco de Chile', location: 'Santiago Centro', synced: false },
    { id: 1025, atm: 'ATM 8841', bank: 'Banco Estado', location: 'Las Condes', synced: true },
    { id: 1028, atm: 'ATM 2210', bank: 'Santander', location: 'Providencia', synced: false },
    { id: 1022, atm: 'ATM 5001', bank: 'Banco de Chile', location: 'Maipú', synced: true }
  ];

  get pendingCount(): number {
    return this.workOrders.filter(x => !x.synced).length;
  }

  get syncedCount(): number {
    return this.workOrders.filter(x => x.synced).length;
  }
  constructor() {
    addIcons({
      addOutline,
      syncOutline,
      wifiOutline,
      shieldCheckmarkOutline,
    });
  }
}
