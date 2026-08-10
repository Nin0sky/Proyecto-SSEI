export interface Usuario {
  id: number;
  email: string;
  fullName: string; // Mapeado de full_name de la API
  role: 'admin' | 'coordinador' | 'tecnico' | 'externo';
  isActive: boolean; // Mapeado de is_active de la API
  createdAt: string; // Mapeado de created_at de la API
}

export interface TokenResponse {
  accessToken: string; // Mapeado de access_token de la API
  tokenType: string;   // Mapeado de token_type de la API
  user: Usuario;
}