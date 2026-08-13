import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

import { lockClosedOutline, mailOutline, arrowForwardOutline } from 'ionicons/icons';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
  ]
})
export class LoginPage {
  email = '';
  password = '';
  isLoading = false;

  private authService = inject(AuthService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  constructor() {
    // Registro correcto de iconos nativos dentro de la clase
    addIcons({
      'lock-closed-outline': lockClosedOutline,
      'mail-outline': mailOutline,
      'arrow-forward-outline': arrowForwardOutline,
    });
  }

  async presentToast(mensaje: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.presentToast('Por favor complete los campos obligatorios', 'danger');
      return;
    }

    this.isLoading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.presentToast('¡Inicio de sesión exitoso!', 'success');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.detail || 'Error de red. Verifique la IP del servidor API.';
        this.presentToast(msg, 'danger');
      }
    });
  }
}