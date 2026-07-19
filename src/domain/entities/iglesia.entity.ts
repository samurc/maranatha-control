/**
 * Iglesia: congregación local de la IASD, unidad de aislamiento multitenant
 * del Sistema (ver Glosario, Requerimiento 3). Identificada por
 * `idOficial`, que design.md establece como el propio `id` del documento
 * (`iglesia_id`).
 *
 * `timezone` es la zona horaria IANA de la Iglesia (Requerimiento 20); su
 * ausencia bloquea la creación de un Registro_Sabatico
 * (`calcularSabadoEclesiastico`, tarea 3.2, Property 49).
 */
export interface Iglesia {
  /** Igual a `idOficial` (design.md: "id_oficial funciona como iglesia_id"). */
  readonly id: string;
  readonly idOficial: string;
  readonly nombre: string;
  readonly asociacionId: string;
  readonly distritoId: string;
  readonly paisCodigo: string;
  readonly timezone?: string;
  readonly fechaAlta: Date;
  readonly creadoEn: Date;
}
