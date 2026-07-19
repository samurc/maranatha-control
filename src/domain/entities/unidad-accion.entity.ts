/**
 * Unidad_Accion: grupo pequeño de Escuela Sabática ("clase") perteneciente
 * a una Iglesia, a cargo de un Maestro (ver Glosario, Requerimiento 5).
 */
export type EstadoUnidadAccion = "activa" | "inactiva";

export interface UnidadAccion {
  readonly id: string;
  readonly iglesiaId: string;
  readonly nombre: string;
  readonly maestroUid: string;
  readonly estado: EstadoUnidadAccion;
  readonly creadoEn: Date;
}
