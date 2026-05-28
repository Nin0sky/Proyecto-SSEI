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
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  IonButtons,
  IonFooter,
} from '@ionic/angular/standalone';

interface ServicioEjecutado {
  tipo: string;
  cantidad: number;
}

@Component({
  selector: 'app-formulario-ot',
  templateUrl: './formulario-ot.page.html',
  styleUrls: ['./formulario-ot.page.scss'],
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
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonButtons,
    IonFooter
  ]
})
export class FormularioOtPage {
  servicios: ServicioEjecutado[] = [{ tipo: 'instalacion', cantidad: 1 }];

  atmIndividualId = '';
  serieChasis = '';
  serieMmbb = '';
  observaciones = '';

  agregarServicio(): void {
    this.servicios.push({ tipo: 'instalacion', cantidad: 1 });
  }

  increment(index: number): void {
    this.servicios[index].cantidad += 1;
  }

  decrement(index: number): void {
    if (this.servicios[index].cantidad > 1) {
      this.servicios[index].cantidad -= 1;
    }
  }
}