import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-registro-otubi',
  templateUrl: './registro-otubi.page.html',
  styleUrls: ['./registro-otubi.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton
  ]
})
export class RegistroOTUBIPage {
  cliente = '';
  atmId = '';
  comuna = '—';
  direccion = '—';

  onAtmInput(): void {
    if (this.atmId.trim().length >= 4) {
      this.comuna = 'Santiago';
      this.direccion = "Av. Libertador Bernardo O'Higgins 1234";
    } else {
      this.comuna = '—';
      this.direccion = '—';
    }
  }
}
