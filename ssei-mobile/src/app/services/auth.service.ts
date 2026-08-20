import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular/standalone'; // 👈 Inyectados


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);

  private readonly baseUrl = environment.apiUrl;

  login(email: string, password_plana: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, {
      email: email,
      password: password_plana
    }).pipe(
      tap((res: any) => {
        // Almacenamos de manera segura el Token JWT y datos del técnico
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('tecnico_id', res.user.id);
        // CORRECCIÓN: Usar res.user.full_name en vez de res.user.fullName para coincidir con la API
        localStorage.setItem('tecnico_nombre', res.user.full_name);
      })
    );
  }

  obtenerOtsServidor(): Observable<any[]> {
    const token = this.obtenerTokenValue();
    const tecnicoId = this.obtenerTecnicoId();

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const url = tecnicoId ? `${this.baseUrl}/ots?tecnico_id=${tecnicoId}` : `${this.baseUrl}/ots`;
    return this.http.get<any[]>(url, { headers });
  }

  obternerOtsServidorSilenciado(): Observable<any[]> {
    const token = this.obtenerTokenValue();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Devuelve el observable de la petición limpia para el control del suscriptor en el dashboard
    return this.http.get<any[]>(`${this.baseUrl}/ots`, { headers });
  }

  obtenerTokenValue(): string | null {
    return localStorage.getItem('token');
  }

  obtenerTecnicoId(): string | null {
    return localStorage.getItem('tecnico_id');
  }


  /**
   * GESTIÓN CENTRALIZADA DE CIERRE DE SESIÓN (Reutilizable en cualquier página)
   * Despliega un diálogo de confirmación nativo y procesa la salida de forma segura.
   */
  async presentarConfirmacionLogout() {
  const alert = await this.alertController.create({
    header: 'Cerrar Sesión',
    message: '¿Estás seguro de que deseas salir de tu cuenta en este dispositivo?',
    cssClass: 'custom-logout-alert',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
        cssClass: 'alert-btn-cancel'
      },
      {
        text: 'Cerrar Sesión',
        role: 'confirm',
        cssClass: 'alert-btn-confirm',
        handler: () => {
          this.ejecutarLogoutProcesado();
        }
      }
    ]
  });

  await alert.present();
}

  /**
   * Limpia el almacenamiento de sesión e inicia la navegación
   */
  private async ejecutarLogoutProcesado() {
  const loading = await this.loadingController.create({
    message: 'Cerrando sesión de manera segura...',
  });
  await loading.present();

  setTimeout(async () => {
    // 1. Limpieza de las llaves locales del usuario
    localStorage.removeItem('token');
    localStorage.removeItem('tecnico_id');
    localStorage.removeItem('tecnico_nombre');

    await loading.dismiss();

    const toast = await this.toastController.create({
      message: 'Sesión finalizada. ¡Buen turno!',
      duration: 2500,
      color: 'primary',
      position: 'bottom'
    });
    await toast.present();

    // 2. Redirección global
    this.router.navigate(['/login']);
  }, 1000);
}
}
