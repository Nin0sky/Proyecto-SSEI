export type OtEstado = 'creada' | 'asignada' | 'en_progreso' | 'pendiente_envio' | 'sincronizada' | 'cerrada';

export interface OtAtm {
  id?: number;
  ot_id?: number;
  etiqueta: string;
  tipo_servicio: string;
  numero_atm: string;
  serie_cajero: string;
  serie_mmbb: string;
  detalles_servicio: string;
  observaciones: string;
}

export interface OtTrabajo {
  id: number;
  banco: string;
  estado: OtEstado;
  fecha_creacion: string;
  hora_programada: string;
  comuna: string;
  direccion: string;
  tecnico_id: number | null;
  nombre_tecnico: string;
  nombre_etv: string;
  nombre_alarma: string;
  origen_servidor: boolean;
  atms: OtAtm[];
}

export interface OtCreate {
  banco: string;
  comuna: string;
  direccion: string;
  hora_programada: string;
  tecnico_id: number;
  nombre_tecnico: string;
  nombre_etv: string;
  nombre_alarma: string;
  atms: OtAtm[];
}

export const OT_ESTADO_LABELS: Record<OtEstado, string> = {
  creada: 'Creada',
  asignada: 'Asignada',
  en_progreso: 'En progreso',
  pendiente_envio: 'Pendiente envío',
  sincronizada: 'Sincronizada',
  cerrada: 'Cerrada',
};

export const OT_ESTADO_COLORS: Record<OtEstado, string> = {
  creada: '#546e7a',
  asignada: '#1976d2',
  en_progreso: '#f57c00',
  pendiente_envio: '#7b1fa2',
  sincronizada: '#388e3c',
  cerrada: '#37474f',
};
