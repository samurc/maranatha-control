/**
 * Evento de auditoría inmutable registrado por toda operación mutadora
 * exitosa del Sistema (ver Glosario, Requerimiento 13).
 */
export interface AuditoriaEvento {
  readonly id: string;
  readonly uid: string;
  readonly accion: string;
  readonly recursoAfectado: string;
  readonly iglesiaId?: string;
  /** Marca de tiempo del servidor, inmutable. */
  readonly timestamp: Date;
}
