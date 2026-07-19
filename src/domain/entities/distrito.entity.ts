/**
 * Distrito: subdivisión territorial de una Asociacion_Mision que agrupa una
 * o más Iglesias, a cargo de un Pastor Distrital (ver Glosario,
 * Requerimiento 2).
 *
 * `supervisorUid` referencia al `uid` de Firebase Auth del usuario con
 * `role` `pastor_distrital` o `anciano` asignado como supervisor
 * (Requirement 2.5); ausente mientras el Distrito no tiene supervisor
 * asignado.
 */
export interface Distrito {
  readonly id: string;
  readonly nombre: string;
  readonly asociacionId: string;
  readonly supervisorUid?: string;
  readonly creadoEn: Date;
}
