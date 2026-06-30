import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
  },
  {
    path: 'formulario-ot',
    loadComponent: () => import('./pages/formulario-ot/formulario-ot.page').then(m => m.FormularioOtPage)
  },
  {
    path: 'registro-otubi',
    loadComponent: () => import('./pages/registro-otubi/registro-otubi.page').then(m => m.RegistroOTUBIPage)
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
