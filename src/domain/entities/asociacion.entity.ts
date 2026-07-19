/**
 * Asociacion_Mision: entidad territorial de nivel superior de la IASD que
 * agrupa Distritos e Iglesias de una región geográfica (ver Glosario,
 * Requerimiento 2).
 *
 * Entidad de dominio pura: sin dependencias de Firebase/Next.js. `creadoEn`
 * es un `Date` en memoria; la traducción a `Timestamp` de Firestore ocurre
 * en el repositorio de Infraestructura correspondiente (tarea 26.1).
 */
export interface Asociacion {
  readonly id: string;
  readonly nombre: string;
  readonly paisCodigo: string;
  readonly creadoEn: Date;
}
