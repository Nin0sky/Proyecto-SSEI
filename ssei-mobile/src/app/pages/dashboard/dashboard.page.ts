import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { AuthService } from '../../services/auth.service';
import { syncOutline, wifiOutline, addOutline, shieldCheckmarkOutline, listOutline, logOutOutline, personCircleOutline } from 'ionicons/icons';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonCard, IonCardContent, IonList, IonItem, IonLabel,
  IonBadge, IonFab, IonFabButton, IonImg,
  IonModal, IonPopover, ToastController, LoadingController
} from '@ionic/angular/standalone';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Subscription, fromEvent, merge } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { OtContextService, OtTrabajo, OtEstado } from '../../ot-context.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons,
    IonButton, IonIcon, IonContent, IonCard, IonCardContent, IonList,
    IonItem, IonLabel, IonBadge, IonFab, IonFabButton, IonImg,
    IonModal, IonPopover // 👈 Importados
  ]
})
export class DashboardPage implements OnDestroy {
  workOrders: OtTrabajo[] = [];
  filtroEstado: OtEstado | null = null;
  isSyncing = false; // Control de estado para animación spinner y throttling
  tecnicoNombre = 'Técnico'; // Propiedad reactiva para el nombre del usuario
  mostrarModalLogout = false; // Propiedad para visualizar/ocultar el Modal

  // Lógica Reactiva de Conectividad Decente
  isOffline = false; 
  offlineBannerVisible = false;
  private networkSubscription?: Subscription;
  private connectionRecoveryToast?: any;

  private readonly toastController = inject(ToastController);
  private readonly loadingController = inject(LoadingController);
  private readonly http = inject(HttpClient);

  constructor(
    private readonly otContextService: OtContextService,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {
    addIcons({ addOutline, syncOutline, wifiOutline, shieldCheckmarkOutline, listOutline, logOutOutline, personCircleOutline });
    this.inicializarMonitoreoRed();
  }

  ionViewWillEnter(): void {
    // 1. Extraer nombre real guardado en el login
    const nombreGuardado = localStorage.getItem('tecnico_nombre');
    this.tecnicoNombre = nombreGuardado ? nombreGuardado : 'Técnico';

    // 2. Forzar al servicio de contexto a recargar OTs específicas y aisladas del nuevo técnico logueado
    this.otContextService.cargar();

    // 3. Proceder a descargar e integrar con la información fresca del servidor
    this.cargarYCombinarOts();
  }

  /**
   * Inicializa el monitoreo de conectividad resiliente implementando
   * un Debounce/Histeresis de 4 segundos para evitar ruidos de avisos innecesarios.
   */
  private inicializarMonitoreoRed() {
    this.isOffline = !navigator.onLine;
    this.offlineBannerVisible = this.isOffline;

    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    this.networkSubscription = merge(online$, offline$)
      .pipe(
        // Esperamos 4 segundos antes de reportar un cambio definitivo de red
        debounceTime(4000) 
      )
      .subscribe((conectado) => {
        if (conectado) {
          this.isOffline = false;
          this.offlineBannerVisible = false;
          this.presentarToastConexionEstablecida();
        } else {
          this.isOffline = true;
          this.offlineBannerVisible = true;
        }
      });
  }

  /**
   * Notificación sutil para avisar al técnico que la señal se restableció con éxito.
   */
  async presentarToastConexionEstablecida() {
    if (this.connectionRecoveryToast) {
      this.connectionRecoveryToast.dismiss();
    }

    this.connectionRecoveryToast = await this.toastController.create({
      message: 'Conectado a la señal central de SSEI',
      duration: 3000, 
      color: 'success',
      position: 'top', 
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await this.connectionRecoveryToast.present();
    
    this.cargarYCombinarOts();
  }

  // --- Controles del Modal de Cierre de Sesión ---

  abrirModalConfirmacion(): void {
    this.mostrarModalLogout = true;
  }

  cerrarModalConfirmacion(): void {
    this.mostrarModalLogout = false;
  }

  /**
   * Ejecuta la limpieza de sesiones local y navega de forma segura al Login
   */
  async confirmarLogout() {
    this.cerrarModalConfirmacion();

    const loading = await this.loadingController.create({
      message: 'Cerrando sesión de manera segura...',
    });
    await loading.present();

    setTimeout(async () => {
      // Remover tokens y variables persistibles locales de sesión
      localStorage.removeItem('token');
      localStorage.removeItem('tecnico_id');
      localStorage.removeItem('tecnico_nombre');

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Sesión finalizada. ¡Buen turno!',
        duration: 3000,
        color: 'primary',
        position: 'bottom'
      });
      await toast.present();

      // Redirigir al técnico al Home de Login
      this.router.navigate(['/login']);
    }, 1200);
  }

  ngOnDestroy(): void {
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
    }
  }

  /**
   * Carga el listado desde el backend y lo sincroniza de manera segura con el contexto local.
   */
  cargarYCombinarOts(): Promise<void> {
    return new Promise((resolve) => {
      this.authService.obternerOtsServidorSilenciado().subscribe({
        next: (ots: any[]) => {
          this.isOffline = false;
          
          const otsMapeadas: OtTrabajo[] = ots.map((ot: any) => {
            return {
              id: ot.id.toString(),
              cliente: ot.banco,
              estado: this.mapearEstadoServidor(ot.estado),
              comuna: ot.comuna,
              direccion: ot.direccion,
              origenServidor: true,
              ubicacion: ot.ubicacion || '',
              fotos: [],
              fechaCreacion: ot.fecha_creacion,
              atms: ot.atms ? ot.atms.map((a: any) => {
                const tipoNormalizado = (a.tipo_servicio ?? '')
                  .toString()
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, '');

                return {
                  etiqueta: a.etiqueta || 'ATM 1',
                  tipoServicio: tipoNormalizado,
                  numeroAtm: a.numero_atm || '',
                  serieCajero: a.serie_cajero || '',
                  serieMmbb: a.serie_mmbb || '',
                  detallesServicio: a.detalles_servicio || '',
                  observaciones: a.observaciones || ''
                };
              }) : []
            };
          });

          otsMapeadas.forEach(otServidor => {
            const indexIndex = this.otContextService.trabajos.findIndex(t => t.id === otServidor.id);
            if (indexIndex !== -1) {
              const localOt = this.otContextService.trabajos[indexIndex];
              if (localOt.estado !== 'asignado') {
                otServidor.estado = localOt.estado;
                otServidor.atms = localOt.atms;
                otServidor.fotos = localOt.fotos;
                otServidor.nombreTecnico = localOt.nombreTecnico;
                otServidor.nombreETV = localOt.nombreETV;
                otServidor.nombreAlarma = localOt.nombreAlarma;
              }
              this.otContextService.trabajos[indexIndex] = otServidor;
            } else {
              this.otContextService.trabajos.push(otServidor);
            }
          });

          this.otContextService.setAtms(this.otContextService.atms);
          this.workOrders = [...this.otContextService.trabajos];
          resolve();
        },
        error: (err: any) => {
          console.error('Error al sincronizar OTs con el servidor:', err);
          this.workOrders = [...this.otContextService.trabajos];
          resolve();
        }
      });
    });
  }

  /**
   * Acción del botón sync-outline: Actualiza el listado de OTs y re-intenta enviar 
   * automáticamente todos los trabajos bloqueados en la cola con el estado 'pendiente_envio'.
   */
  async sincronizarDashboard() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    const loading = await this.loadingController.create({
      message: 'Comprobando conexión y cargando datos...',
    });
    await loading.present();

    try {
      const pendientes = this.otContextService.trabajos.filter(x => x.estado === 'pendiente_envio');

      if (pendientes.length > 0) {
        const token = localStorage.getItem('token') || localStorage.getItem('auth-token') || '';
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        let enviadosConExito = 0;

        for (const ot of pendientes) {
          try {
            const updateStateUrl = `http://localhost:8000/ots/${ot.id}/estado`;
            await firstValueFrom(this.http.patch(updateStateUrl, { estado: 'sincronizada' }, { headers }));

            const cOt = this.otContextService.trabajos.find(t => t.id === ot.id);
            if (cOt) {
              cOt.estado = 'sincronizado';
            }
            enviadosConExito++;
          } catch (err) {
            console.error(`Fallo de red al intentar sincronizar la OT #${ot.id}:`, err);
          }
        }

        this.otContextService.setAtms(this.otContextService.atms);

        if (enviadosConExito > 0) {
          const toast = await this.toastController.create({
            message: `¡Se enviaron con éxito ${enviadosConExito} órdenes rezagadas al servidor!`,
            duration: 3500,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
        }
      }

      await this.cargarYCombinarOts();

      this.isOffline = false;
      this.offlineBannerVisible = false;

      const toastSuccess = await this.toastController.create({
        message: '¡Conexión establecida con éxito. Órdenes actualizadas!',
        duration: 3000,
        color: 'success',
        position: 'bottom'
      });
      await toastSuccess.present();

    } catch (e) {
      console.error('Error crítico durante la sincronización general:', e);
      this.isOffline = true;
      this.offlineBannerVisible = true;

      const toastError = await this.toastController.create({
        message: 'No se pudo contactar al servidor. Operando en modo Offline.',
        duration: 3500,
        color: 'danger',
        position: 'bottom'
      });
      await toastError.present();
    } finally {
      this.isSyncing = false;
      await loading.dismiss();
    }
  }

  private mapearEstadoServidor(estadoServidor: string): OtEstado {
    const mapa: Record<string, OtEstado> = {
      'creada': 'asignado',
      'asignada': 'asignado',
      'en_progreso': 'en_progreso',
      'pendiente_envio': 'pendiente_envio',
      'sincronizada': 'sincronizado',
      'cerrada': 'sincronizado'
    };
    return mapa[estadoServidor] || 'asignado';
  }

  get filteredWorkOrders(): OtTrabajo[] {
    if (!this.filtroEstado) return this.workOrders;
    return this.workOrders.filter(ot => ot.estado === this.filtroEstado);
  }

  get totalOrdersToday(): number {
    return this.workOrders.filter(x => 
      x.estado === 'asignado' || 
      x.estado === 'en_progreso' || 
      x.estado === 'pendiente_envio'
    ).length;
  }

  get pendingCount(): number {
    return this.workOrders.filter(x => x.estado !== 'sincronizado').length;
  }

  get syncedCount(): number {
    return this.workOrders.filter(x => x.estado === 'sincronizado').length;
  }

  filtroVisible = false;
  toggleFiltro(): void {
    this.filtroVisible = !this.filtroVisible;
  }

  seleccionarFiltro(estado: OtEstado | null): void {
    this.filtroEstado = estado;
    this.filtroVisible = false;
  }

  badgeColor(estado: OtEstado): string {
    const colores: Record<OtEstado, string> = {
      asignado: 'warning', en_progreso: 'primary',
      pendiente_envio: 'danger', sincronizado: 'success',
    };
    return colores[estado];
  }

  badgeLabel(estado: OtEstado): string {
    const etiquetas: Record<OtEstado, string> = {
      asignado: 'Asignado', en_progreso: 'En Progreso',
      pendiente_envio: 'Pendiente Envío', sincronizado: 'Sincronizado',
    };
    return etiquetas[estado];
  }

  abrirTrabajo(id: string): void {
    this.otContextService.cargarTrabajo(id);
    this.router.navigate(['/registro-otubi']);
  }

  nuevoTrabajo(): void {
    this.otContextService.crearTrabajo();
    this.router.navigate(['/registro-otubi']);
  }

  tituloTrabajo(ot: OtTrabajo): string {
    const numeros = ot.atms.map(a => a.numeroAtm.trim()).filter(n => n.length > 0);
    if (numeros.length > 0) {
      return numeros.length === 1 ? `ATM ${numeros[0]}` : `[${numeros.join('-')}]`;
    }
    return ot.id.startsWith('local-') ? 'Nuevo trabajo' : `#${ot.id}`;
  }
}