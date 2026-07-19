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
    <div aria-label="Dashboard Analítico" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Analítico</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Indicadores agregados del trimestre en curso
        </p>
      </div>

      {/* Summary cards */}
      {resultado.iglesias.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(() => {
            const totales = resultado.iglesias.reduce(
              (acc, ig) => ({
                presentes: acc.presentes + ig.presentes,
                ausentes: acc.ausentes + ig.ausentes,
                visitas: acc.visitas + ig.visitas,
                desercion: acc.desercion + ig.participantesEnDesercion,
              }),
              { presentes: 0, ausentes: 0, visitas: 0, desercion: 0 }
            );
            return (
              <>
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Presentes</p>
                  <p className="mt-1 text-2xl font-bold text-green-500">{totales.presentes}</p>
                </div>
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Ausentes</p>
                  <p className="mt-1 text-2xl font-bold text-red-400">{totales.ausentes}</p>
                </div>
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Visitas</p>
                  <p className="mt-1 text-2xl font-bold text-blue-400">{totales.visitas}</p>
                </div>
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">En deserción</p>
                  <p className="mt-1 text-2xl font-bold text-amber-400">{totales.desercion}</p>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-foreground/10">
        <table className="w-full text-sm">
          <caption className="sr-only">Indicadores agregados por Iglesia</caption>
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
              <th scope="col" className="px-4 py-3 text-left font-medium text-foreground/70">Iglesia</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-foreground/70">Presentes</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-foreground/70">Ausentes</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-foreground/70">Visitas</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-foreground/70">Prom. estudio</th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-foreground/70">Deserción</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-foreground/70">Pendientes de cierre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {resultado.iglesias.map((iglesia) => (
              <tr key={iglesia.iglesiaId} className="hover:bg-foreground/[0.02] transition-colors">
                <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">
                  {iglesia.nombre}
                </th>
                <td className="px-4 py-3 text-right text-green-500 font-medium">{iglesia.presentes}</td>
                <td className="px-4 py-3 text-right text-red-400 font-medium">{iglesia.ausentes}</td>
                <td className="px-4 py-3 text-right text-blue-400 font-medium">{iglesia.visitas}</td>
                <td className="px-4 py-3 text-right text-foreground/80">{iglesia.promedioDiasEstudio.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-amber-400 font-medium">{iglesia.participantesEnDesercion}</td>
                <td className="px-4 py-3 text-left text-foreground/60 text-xs max-w-xs">
                  {iglesia.sabadosPendientesDeCierre.length > 0 ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {iglesia.sabadosPendientesDeCierre.slice(0, 5).map((fecha) => (
                        <span key={fecha} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-400">
                          {fecha}
                        </span>
                      ))}
                      {iglesia.sabadosPendientesDeCierre.length > 5 && (
                        <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-foreground/50">
                          +{iglesia.sabadosPendientesDeCierre.length - 5} más
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-green-500">✓ Todo cerrado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
