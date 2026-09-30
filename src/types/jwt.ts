export interface JwtUser {
  id_usuario: string;
  id_rol?: string;
  nombre: string;
  email: string;
  rol: 'profesor' | 'alumno' | 'admin';
}