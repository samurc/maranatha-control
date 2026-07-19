/**
 * Calculadora pura del `Sabado_Eclesiastico` vigente para una Iglesia
 * (Requerimiento 20).
 *
 * Función de dominio pura: no depende de Firebase, Next.js ni de la hora
 * del servidor/cliente. Todo cálculo temporal se parametriza explícitamente
 * por la zona horaria IANA de la Iglesia; el instante de referencia
 * (`fecha`) SIEMPRE lo provee el llamador (más adelante, un `ClockPort` en
 * la capa de Aplicación) — esta función nunca instancia `new Date()` por
 * su cuenta (design.md, "Objetivos de diseño" #4).
 */

import { type Result, ok, err } from "../shared/result";
import { type DomainError, validationError } from "../shared/domain-error";
import type { SabadoEclesiastico } from "../value-objects/sabado-eclesiastico.vo";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Calcula el `Sabado_Eclesiastico` vigente para el instante `fecha`, en la
 * zona horaria IANA `timezone` de la Iglesia.
 *
 * Semántica implementada:
 * - **Sábado vigente** (Requirement 20.1): dado un instante cualquiera, se
 *   determina la fecha calendario (año/mes/día) que ese instante tiene en
 *   `timezone`, y se avanza al sábado de esa misma semana calendario
 *   (semana domingo→sábado). El cálculo se hace enteramente en función de
 *   `timezone`; el mismo instante en otra zona horaria puede producir un
 *   `fechaISO` distinto.
 * - **Trimestre** (`numeroTrimestre`): trimestre calendario estándar de la
 *   Escuela Sabática (T1: enero-marzo, T2: abril-junio, T3: julio-septiembre,
 *   T4: octubre-diciembre), determinado por el mes del sábado calculado.
 * - **Número de sábado** (`numeroSabado`, Requirement 20.2): posición
 *   ordinal (1-based) del sábado calculado dentro de su Trimestre, contando
 *   desde el primer sábado en o después del primer día del Trimestre
 *   (ese primer sábado es siempre `numeroSabado=1`). El valor se reinicia a
 *   1 exactamente al comenzar cada nuevo Trimestre.
 *
 *   Nota: los trimestres calendario no tienen una duración múltiplo exacto
 *   de 7 días, por lo que en una minoría de combinaciones año/trimestre el
 *   último sábado del trimestre puede numerarse 14 en vez de caer dentro de
 *   1-13. Este caso límite queda documentado aquí para su triage explícito
 *   en la prueba de propiedades de la tarea 3.4 (Property 48), en vez de
 *   resolverse unilateralmente en esta tarea.
 * - **Zona horaria no configurada** (Requirement 20.3): si `timezone` es
 *   `undefined`, `null`, cadena vacía, o no es un identificador IANA
 *   reconocido, se retorna un `DomainError` de tipo `validacion` en vez de
 *   lanzar una excepción o de recurrir silenciosamente a UTC o a la zona
 *   horaria del servidor/cliente.
 *
 * @param fecha Instante UTC de referencia, provisto por el llamador.
 * @param timezone Zona horaria IANA asociada a la Iglesia (ej. "America/Santiago").
 */
export function calcularSabadoEclesiastico(
  fecha: Date,
  timezone: string | undefined | null
): Result<SabadoEclesiastico, DomainError> {
  if (!timezone) {
    return err(
      validationError(
        "La Iglesia no tiene una zona horaria configurada. Configure una zona horaria IANA antes de crear un Registro_Sabatico."
      )
    );
  }

  const civilDate = obtenerFechaCivilEnZona(fecha, timezone);
  if (civilDate === null) {
    return err(
      validationError(
        `La zona horaria "${timezone}" no es un identificador IANA válido.`
      )
    );
  }

  // Weekday del calendario (0=domingo...6=sábado) es una función pura de la
  // fecha civil (año/mes/día); se calcula anclando esa fecha civil a un
  // instante UTC "sintético" (medianoche UTC) exclusivamente para poder usar
  // aritmética de días sin efectos de huso horario ni de horario de verano.
  const civilUTC = Date.UTC(civilDate.anio, civilDate.mes - 1, civilDate.dia);
  const weekday = new Date(civilUTC).getUTCDay();
  const diasHastaSabado = (6 - weekday + 7) % 7;
  const sabadoUTC = civilUTC + diasHastaSabado * MS_POR_DIA;
  const sabado = new Date(sabadoUTC);

  const anio = sabado.getUTCFullYear();
  const mes = sabado.getUTCMonth() + 1; // 1-12
  const dia = sabado.getUTCDate();
  const numeroTrimestre = Math.ceil(mes / 3) as 1 | 2 | 3 | 4;

  const mesInicioTrimestre = (numeroTrimestre - 1) * 3 + 1;
  const inicioTrimestreUTC = Date.UTC(anio, mesInicioTrimestre - 1, 1);
  const weekdayInicioTrimestre = new Date(inicioTrimestreUTC).getUTCDay();
  const diasHastaPrimerSabado = (6 - weekdayInicioTrimestre + 7) % 7;
  const primerSabadoTrimestreUTC =
    inicioTrimestreUTC + diasHastaPrimerSabado * MS_POR_DIA;

  const numeroSabado =
    Math.round((sabadoUTC - primerSabadoTrimestreUTC) / MS_POR_DIA / 7) + 1;

  return ok({
    anio,
    numeroTrimestre,
    numeroSabado,
    fechaISO: formatearFechaISO(anio, mes, dia),
    timezone,
  });
}

interface FechaCivil {
  anio: number;
  mes: number; // 1-12
  dia: number;
}

/**
 * Extrae los componentes de fecha civil (año/mes/día) que `instante` tiene
 * en `timezone`, usando `Intl.DateTimeFormat`. Retorna `null` si
 * `timezone` no es un identificador IANA reconocido por el runtime.
 */
function obtenerFechaCivilEnZona(
  instante: Date,
  timezone: string
): FechaCivil | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const partes = formatter.formatToParts(instante);
    const anio = Number(partes.find((p) => p.type === "year")?.value);
    const mes = Number(partes.find((p) => p.type === "month")?.value);
    const dia = Number(partes.find((p) => p.type === "day")?.value);
    if (
      !Number.isFinite(anio) ||
      !Number.isFinite(mes) ||
      !Number.isFinite(dia)
    ) {
      return null;
    }
    return { anio, mes, dia };
  } catch {
    // `Intl.DateTimeFormat` lanza `RangeError` cuando `timeZone` no es un
    // identificador IANA válido.
    return null;
  }
}

function formatearFechaISO(anio: number, mes: number, dia: number): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${anio}-${pad(mes)}-${pad(dia)}`;
}
