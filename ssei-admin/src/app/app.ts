import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common'; // Agregamos CommonModule para directivas condicionales
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/services/auth.service'; // Importamos el servicio

@Component({
  selector: 'app-root',
  imports: [
    CommonModule, // Agregado para usar estructuras condicionales (o utilizar @if de Angular 17+)
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Inyectamos el servicio de Autenticación
  protected readonly authService = inject(AuthService);
  protected readonly title = signal('SSEI Admin');

  // Método de conveniencia para cerrar la sesión
  logout(): void {
    this.authService.logout();
  }
}