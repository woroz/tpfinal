export interface JwtUser {
  id_usuario: string;  
  nombre: string;
  email: string;
  rol: 'profesor' | 'alumno' | 'admin';
}