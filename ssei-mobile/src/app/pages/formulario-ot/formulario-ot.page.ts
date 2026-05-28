import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-formulario-ot',
  templateUrl: './formulario-ot.page.html',
  styleUrls: ['./formulario-ot.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class FormularioOtPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
