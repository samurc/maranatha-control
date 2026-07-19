/**
 * `DashboardAnalitico` (Requerimiento 11.1-11.4, tarea 36.1).
 *
 * Vista de Dashboard Analítico consumiendo el resultado ya resuelto de
 * `consultar-dashboard.use-case.ts` (tarea 22.1). Una única vista sirve a
 * los cuatro roles autorizados (Director_ES, Pastor_Distrital/Anciano,
 * Admin_Asociacion, Admin_Global): el propio caso de uso ya resolvió el
 * alcance territorial correcto por rol (Property 30), por lo que este
 * componente de presentación simplemente itera `resultado.iglesias` sin
 * necesitar ninguna lógica condicional por rol — mostrar "más o menos
 * Iglesias" es enteramente una consecuencia de qué contiene el arreglo
 * recibido, no de una rama de código distinta por rol.
 *
 * Componente de servidor puro: recibe el resultado como prop, igual que
 * `PanelAlumno` (tarea 34.5), evitando acoplar la UI a los puertos de
 * infraestructura del caso de uso.
 */
import type { DashboardResultado } from "../../application/use-cases/dashboard/consultar-dashboard.use-case";

export interface DashboardAnaliticoProps {
  readonly resultado: DashboardResultado;
}

export function DashboardAnalitico({
  resultado,
}: DashboardAnaliticoProps): React.JSX.Element {
  return (
    <main aria-label="Dashboard Analítico">
      <h1>Dashboard Analítico</h1>
      <table>
        <caption>Indicadores agregados por Iglesia</caption>
        <thead>
          <tr>
            <th scope="col">Iglesia</th>
            <th scope="col">Presentes</th>
            <th scope="col">Ausentes</th>
            <th scope="col">Visitas</th>
            <th scope="col">Promedio días de estudio</th>
            <th scope="col">Participantes en deserción</th>
            <th scope="col">Sábados pendientes de cierre</th>
          </tr>
        </thead>
        <tbody>
          {resultado.iglesias.map((iglesia) => (
            <tr key={iglesia.iglesiaId}>
              <th scope="row">{iglesia.nombre}</th>
              <td>{iglesia.presentes}</td>
              <td>{iglesia.ausentes}</td>
              <td>{iglesia.visitas}</td>
              <td>{iglesia.promedioDiasEstudio.toFixed(1)}</td>
              <td>{iglesia.participantesEnDesercion}</td>
              <td>
                {iglesia.sabadosPendientesDeCierre.length > 0
                  ? iglesia.sabadosPendientesDeCierre.join(", ")
                  : "Ninguno"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
