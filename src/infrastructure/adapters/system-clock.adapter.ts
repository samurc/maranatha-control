/**
 * `SystemClockAdapter` (Requerimiento 19.2).
 *
 * Implementación de producción de `ClockPort` sobre el reloj real del
 * sistema. Los casos de uso nunca instancian `new Date()` directamente
 * (design.md, "Objetivos de diseño" #4); este adaptador es el único punto
 * de infraestructura donde `new Date()` se invoca para resolver el
 * instante "actual" real, inyectado en las páginas de Presentación que
 * resuelven casos de uso (tareas 43.2-43.4). Las pruebas de casos de uso
 * usan `FakeClockPort` (tarea 8.4) en su lugar.
 */
import type { ClockPort } from "../../application/ports/clock.port";

export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }
}
