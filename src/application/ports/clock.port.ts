/**
 * Reloj inyectable para pruebas deterministas (design.md, sección
 * "Aplicación", lista de puertos: "`clock.port.ts` // reloj inyectable
 * para pruebas deterministas").
 *
 * Todo caso de uso que necesita el instante actual (p. ej.
 * `registrar-asistencia.use-case.ts` para resolver el Sabado_Eclesiastico
 * vigente, o `autorregistrar-estudio-diario.use-case.ts` para el día
 * calendario del Autorregistro) DEBE recibir el instante a través de este
 * puerto, nunca instanciando `new Date()` directamente, preservando el
 * objetivo de diseño de que ningún cálculo temporal dependa de la hora del
 * servidor/cliente de forma no inyectable (design.md, "Objetivos de
 * diseño" #4).
 */
export interface ClockPort {
  /** Instante UTC actual. */
  now(): Date;
}
