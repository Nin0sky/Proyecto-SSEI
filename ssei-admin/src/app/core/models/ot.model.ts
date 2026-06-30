export type OtEstado = 'asignado' | 'en_progreso' | 'pendiente_envio' | 'sincronizado';

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
  cliente: string;
  estado: OtEstado;
  fecha_creacion: string;
  comuna: string;
  direccion: string;
  nombre_tecnico: string;
  nombre_etv: string;
  nombre_alarma: string;
  origen_servidor: boolean;
  atms: OtAtm[];
}

export interface OtCreate {
  cliente: string;
  estado: OtEstado;
  comuna: string;
  direccion: string;
  nombre_tecnico: string;
  nombre_etv: string;
  nombre_alarma: string;
  atms: OtAtm[];
}

export const OT_ESTADO_LABELS: Record<OtEstado, string> = {
  asignado: 'Asignado',
  en_progreso: 'En progreso',
  pendiente_envio: 'Pendiente envío',
  sincronizado: 'Sincronizado',
};

export const OT_ESTADO_COLORS: Record<OtEstado, string> = {
  asignado: '#1976d2',
  en_progreso: '#f57c00',
  pendiente_envio: '#7b1fa2',
  sincronizado: '#388e3c',
};
