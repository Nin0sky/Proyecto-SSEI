import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'ots',
    loadComponent: () => import('./pages/ot-lista/ot-lista.component').then(m => m.OtListaComponent)
  },
  {
    path: 'ots/nueva',
    loadComponent: () => import('./pages/ot-form/ot-form.component').then(m => m.OtFormComponent)
  },
  {
    path: 'ots/:id',
    loadComponent: () => import('./pages/ot-detalle/ot-detalle.component').then(m => m.OtDetalleComponent)
  },
  {
    path: 'ots/:id/editar',
    loadComponent: () => import('./pages/ot-form/ot-form.component').then(m => m.OtFormComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
