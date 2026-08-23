/**
 * Utilidades compartidas del módulo Encargados: cálculo de los próximos
 * sábados, etiquetas de casilleros y tipos comunes. Reutilizado por
 * `page.tsx` (render) y `actions.ts` (exportación a Excel) para evitar
 * divergencias en el conjunto de fechas mostradas/exportadas.
 */

/** Cantidad de próximos sábados que se muestran como filas en la zona de arrastre. */
export const CANTIDAD_SABADOS = 13;

/** Rol/tarea de cada casillero (índice = número de slot). */
export const ETIQUETAS_CASILLERO = [
  "Repaso de lección",
  "Informe misionero",
  "Bienvenida, himnos, oración",
] as const;

/** Estado de un sábado en el módulo Encargados. */
export type EstadoSabado = "por_confirmar" | "confirmado";

export interface SabadoDisponible {
  /** Fecha del sábado en formato "YYYY-MM-DD". */
  fechaISO: string;
  /** Etiqueta legible, p. ej. "Sábado 23 de agosto". */
  etiqueta: string;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Formatea una fecha local a "YYYY-MM-DD" (sin desfase por zona horaria UTC). */
export function aFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Calcula los próximos `cantidad` sábados a partir de `desde` (incluyendo
 * ese día si ya es sábado). Día 6 = sábado en `Date.getDay()`.
 */
export function proximosSabados(desde: Date, cantidad: number): SabadoDisponible[] {
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  while (cursor.getDay() !== 6) {
    cursor.setDate(cursor.getDate() + 1);
  }
  const sabados: SabadoDisponible[] = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(cursor);
    fecha.setDate(cursor.getDate() + i * 7);
    sabados.push({
      fechaISO: aFechaISO(fecha),
      etiqueta: `Sábado ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`,
    });
  }
  return sabados;
}
