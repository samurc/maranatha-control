/**
 * Participante: persona registrada dentro de una Unidad de Acción (miembro
 * o visita), con o sin cuenta de usuario vinculada (ver Glosario,
 * Requerimiento 6).
 */
export type EstadoParticipante = "activo" | "inactivo";

/**
 * Código de enlace de un solo uso que vincula un Participante sin
 * `userUid` a una futura cuenta de Alumno (Requerimientos 1.7, 1.8, 6.7).
 */
export interface CodigoEnlace {
  readonly codigo: string;
  readonly usado: boolean;
  readonly emitidoPor: string;
  readonly emitidoEn: Date;
}

export interface Participante {
  readonly id: string;
  readonly iglesiaId: string;
  readonly unidadId: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly esVisita: boolean;
  /** Opcional: nunca expuesto en agregados del Dashboard (Requirement 21.1). */
  readonly esMenorEdad?: boolean;
  readonly estado: EstadoParticipante;
  /** `uid` de Firebase Auth del Alumno vinculado, si existe (Requirement 6.5, 6.6). */
  readonly userUid?: string;
  readonly codigoEnlace?: CodigoEnlace;
  readonly creadoEn: Date;
}
