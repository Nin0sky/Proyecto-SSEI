import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren inicio de sesión obligatorio.
 * Redirige al login si el usuario no ha iniciado sesión.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Si la ruta requiere ciertos roles, los validamos
    const rolesRequeridos = route.data?.['roles'] as string[];
    
    if (rolesRequeridos && rolesRequeridos.length > 0) {
      if (authService.hasRole(rolesRequeridos)) {
        return true;
      }
      
      // Si el rol es insuficiente, redirigimos al dashboard principal
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }

  // Redirigir a login guardando la URL a la que intentaba acceder el usuario
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

/**
 * Guard de acceso público inverso (ej. Login).
 * Impide que un usuario ya autenticado vuelva a entrar a la ventana de login.
 */
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};