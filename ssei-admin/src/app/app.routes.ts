import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Ruta pública de Login (usa publicGuard)
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },

  // Ruta principal redirige al dashboard protegido
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Rutas con protección de autenticación general
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ots',
    loadComponent: () => import('./pages/ot-lista/ot-lista.component').then(m => m.OtListaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ots/:id',
    loadComponent: () => import('./pages/ot-detalle/ot-detalle.component').then(m => m.OtDetalleComponent),
    canActivate: [authGuard]
  },

  // Rutas protegidas con RBAC (Solo Administradores o Coordinadores pueden crear/editar)
  {
    path: 'ots/nueva',
    loadComponent: () => import('./pages/ot-form/ot-form.component').then(m => m.OtFormComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'coordinador'] }
  },
  {
    path: 'ots/:id/editar',
    loadComponent: () => import('./pages/ot-form/ot-form.component').then(m => m.OtFormComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'coordinador'] }
  },

  // Cualquier ruta inválida redirige de vuelta al dashboard
  { path: '**', redirectTo: 'dashboard' }
];