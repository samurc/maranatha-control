/**
 * Sabado_Eclesiastico: fecha calendario correspondiente a un sábado dentro
 * de un Trimestre (periodo de trece sábados usado por la Escuela Sabática
 * de la IASD), calculada en la zona horaria IANA local de la Iglesia
 * (ver Glosario y Requerimiento 20).
 *
 * Value Object de dominio puro: sin dependencias de Firebase/Next.js.
 * Todo cálculo temporal se parametriza explícitamente por zona horaria
 * IANA, nunca por la zona horaria del servidor ni del cliente
 * (design.md, "Objetivos de diseño" #4).
 */
export interface SabadoEclesiastico {
  /** Año calendario (en la zona horaria de la Iglesia) del sábado calculado. */
  anio: number;
  /** Trimestre calendario 1-4 al que pertenece el sábado. */
  numeroTrimestre: 1 | 2 | 3 | 4;
  /** Número cíclico del sábado dentro del Trimestre, entre 1 y 13. */
  numeroSabado: number;
  /** Fecha calendario del sábado (`YYYY-MM-DD`) en la zona horaria de la Iglesia. */
  fechaISO: string;
  /** Zona horaria IANA de la Iglesia usada para el cálculo, ej. "America/Santiago". */
  timezone: string;
}
