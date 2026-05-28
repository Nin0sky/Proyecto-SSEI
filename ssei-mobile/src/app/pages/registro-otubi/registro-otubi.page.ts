import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-registro-otubi',
  templateUrl: './registro-otubi.page.html',
  styleUrls: ['./registro-otubi.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class RegistroOTUBIPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
