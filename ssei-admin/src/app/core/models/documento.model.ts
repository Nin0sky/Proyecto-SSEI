export interface Documento {
  id: number;
  nombreOriginal: string; // Mapeado de nombre_original de la API
  nombreSistema: string;  // Mapeado de nombre_sistema de la API
  pesoBytes: number;      // Mapeado de peso_bytes de la API
  mimetype: string;
  categoria: string;
  banco: string | null;
  numeroAtm: string | null; // Mapeado de numero_atm de la API
  subidoPorId: number | null; // Mapeado de subido_por_id de la API
  createdAt: string;      // Mapeado de created_at de la API
  deletedAt: string | null; // Mapeado de deleted_at de la API
  deletedById: number | null; // Mapeado de deleted_by_id de la API
}