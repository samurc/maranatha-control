/**
 * `PanelAlumno` (Requerimiento 15.3, tarea 34.5).
 *
 * Panel principal de un usuario con `role=alumno`: consume
 * `consultar-mi-progreso.use-case.ts` (tarea 20.5) y renderiza
 * ÚNICAMENTE su propio estudio diario/asistencia y las metas agregadas y
 * anónimas de su Unidad_Accion, nunca datos individuales de otros
 * Participantes — exactamente la forma que retorna el caso de uso
 * (`MiProgreso`), sin campos adicionales.
 *
 * Componente de servidor: recibe el resultado ya resuelto del caso de uso
 * como prop (`progreso`), en vez de invocar el caso de uso directamente
 * dentro del componente — esto mantiene el componente puro/testeable con
 * Testing Library sin necesitar dobles de los puertos de infraestructura
 * en cada prueba de UI (la resolución del caso de uso ocurre en la
 * `page.tsx`/Route Handler que lo renderiza).
 */
import type { MiProgreso } from "../../application/use-cases/registro-sabatico/consultar-mi-progreso.use-case";

export interface PanelAlumnoProps {
  readonly progreso: MiProgreso;
}

export function PanelAlumno({ progreso }: PanelAlumnoProps): React.JSX.Element {
  const { miEstado, metasAgregadas, asistenciaHistorica } = progreso;

  return (
    <main aria-label="Mi progreso">
      <h1>Mi progreso</h1>

      <section aria-labelledby="mi-estado-heading">
        <h2 id="mi-estado-heading">Mi estado de este sábado</h2>
        <p>Presente: {miEstado.presente ? "Sí" : "No"}</p>
        <p>Días de estudio: {miEstado.diasEstudio}</p>
        <p>Código visual: {miEstado.codigoVisual}</p>
      </section>

      <section aria-labelledby="asistencia-historica-heading">
        <h2 id="asistencia-historica-heading">Mi asistencia histórica</h2>
        <ul>
          {asistenciaHistorica.map((entrada) => (
            <li key={entrada.fechaISO}>
              {entrada.fechaISO}: {entrada.codigoVisual} (
              {entrada.diasEstudio} días de estudio)
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="metas-unidad-heading">
        <h2 id="metas-unidad-heading">Metas agregadas de mi Unidad</h2>
        <p>Participantes: {metasAgregadas.totalParticipantes}</p>
        <p>
          Promedio de días de estudio:{" "}
          {metasAgregadas.promedioDiasEstudio.toFixed(1)}
        </p>
        <p>
          Proporción de presentes:{" "}
          {(metasAgregadas.proporcionPresentes * 100).toFixed(0)}%
        </p>
      </section>
    </main>
  );
}
