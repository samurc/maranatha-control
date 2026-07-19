/**
 * Doble en memoria de `ClockPort` (tarea 8.4): reloj determinista para
 * pruebas de casos de uso, con instante mutable vía `setNow`/`advance`.
 */
import type { ClockPort } from "../ports/clock.port";

export class FakeClockPort implements ClockPort {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  setNow(fecha: Date): void {
    this.current = fecha;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
