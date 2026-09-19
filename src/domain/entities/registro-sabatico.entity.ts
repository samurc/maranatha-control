/**
 * Registro_Sabatico: documento único por Unidad de Acción y sábado que
 * contiene la asistencia, el estudio diario y el seguimiento pastoral de
 * todos los Participantes de esa unidad para ese sábado (ver Glosario,
 * Requerimiento 7). Agregado único (design.md, "Decisiones clave"): una
 * sola escritura consolidada, nunca una colección de asistencias por
 * Participante.
 */

import type { SabadoEclesiastico } from "../value-objects/sabado-eclesiastico.vo";

/** Enum de `accion` de Seguimiento_Pastoral (Requirement 9.2). */
export type AccionSeguimientoPastoral =
  | "llamado_telefonico"
  | "enfermo_oracion"
  | "visitado_en_semana";

/**
 * Seguimiento_Pastoral: acción de visitación misionera/pastoral realizada
 * sobre un Participante (ver Glosario, Requerimiento 9). Embebido dentro de
 * `asistencia[participanteId]`, nunca en una colección separada
 * (design.md, "Decisiones clave").
 */
export interface SeguimientoPastoral {
  readonly accion: AccionSeguimientoPastoral;
  readonly registradoPor: string;
  readonly registradoEn: Date;
}

/** Fotografía de asistencia/estudio de un Participante para un sábado dado. */
export interface AsistenciaParticipante {
  readonly presente: boolean;
  /** 0..7 (Requirement 7.5). */
  readonly diasEstudio: number;
  /** `true` si el último incremento de `diasEstudio` fue un Autorregistro del Alumno (Requirement 10.1, 10.4). */
  readonly autorregistrado: boolean;
  /** "P7", "A", "F", "V"... calculado por `calcularCodigoVisual` (tarea 3.6). */
  readonly codigoVisual: string;
  readonly seguimientoPastoral: readonly SeguimientoPastoral[];
  /**
   * `participanteId` del Participante activo asignado como responsable de
   * contactar a este Participante cuando estuvo ausente. Opcional: solo se
   * establece desde la vista /registros al asignar un responsable de
   * seguimiento a un ausente.
   */
  readonly responsableId?: string;
  /**
   * `true` si la ausencia fue justificada y, por tanto, queda exonerada de la
   * asignación de un responsable de seguimiento. Al justificar se limpia
   * `responsableId`. Se establece desde la vista /registros.
   */
  readonly justificado?: boolean;
  /**
   * Estado de contacto del seguimiento al ausente: `true` si ya fue contactado,
   * `false` si aún no. Se establece desde la vista /registros con los botones
   * "Contactado" / "Sin contactar".
   */
  readonly contactado?: boolean;
}

/** Totales rápidos agregados de un Registro_Sabatico (`calcularTotalesRapidos`, tarea 6.1). */
export interface TotalesRapidos {
  readonly presentes: number;
  readonly ausentes: number;
  readonly visitas: number;
}

export type EstadoRegistroSabatico = "borrador" | "cerrado";

export interface RegistroSabatico {
  /** ID determinístico `{iglesia_id}_{unidad_id}_{anio}_T{trimestre}_S{sabado}` (Requirement 7.1). */
  readonly id: string;
  readonly iglesiaId: string;
  readonly unidadId: string;
  readonly sabadoEclesiastico: SabadoEclesiastico;
  readonly estado: EstadoRegistroSabatico;
  /** Indexado por `participanteId`. */
  readonly asistencia: Readonly<Record<string, AsistenciaParticipante>>;
  readonly totalesRapidos: TotalesRapidos;
  /** `uid` del Secretario/Admin_Global que cerró el registro (Requirement 8.1). */
  readonly cerradoPor?: string;
  readonly fechaCierre?: Date;
  readonly creadoEn: Date;
  readonly actualizadoEn: Date;
}
