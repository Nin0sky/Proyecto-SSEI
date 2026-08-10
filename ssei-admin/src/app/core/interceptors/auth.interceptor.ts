import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Clonamos la solicitud para agregar de forma segura la cabecera de seguridad si hay un token activo.
  // Evitamos inyectar la cabecera si la consulta es el login mismo.
  if (token && !req.url.includes('/auth/login')) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  // Si no hay token, procesamos la petición original sin modificaciones
  return next(req);
};