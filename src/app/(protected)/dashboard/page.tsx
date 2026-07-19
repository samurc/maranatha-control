/**
 * `(protected)/dashboard/page.tsx` (Requerimiento 23.1, 23.2, tarea 43.2).
 *
 * Monta `<SectionGuard resource="dashboard">` alrededor de
 * `<DashboardAnalitico>`, con los datos resueltos por
 * `consultar-dashboard.use-case.ts` (Requirement 11.1-11.4). El periodo
 * por defecto consultado es el trimestre en curso (13 semanas hacia atrás
 * desde el instante actual, resuelto por `SystemClockAdapter`): el diseño
 * no especifica un mecanismo de selección de periodo en la UI para esta
 * tarea, por lo que se usa el rango completo más reciente que el caso de
 * uso admite sin parámetros adicionales.
 */
import { SectionGuard } from "../../../presentation/components/section-guard";
import { DashboardAnalitico } from "../../../presentation/components/dashboard-analitico";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { crearConsultarDashboardUseCase } from "../../../application/use-cases/dashboard/consultar-dashboard.use-case";
import { FirestoreIglesiaRepository } from "../../../infrastructure/repositories/firestore-iglesia.repository";
import { FirestoreRegistroSabaticoRepository } from "../../../infrastructure/repositories/firestore-registro-sabatico.repository";
import { FirestoreUnidadAccionRepository } from "../../../infrastructure/repositories/firestore-unidad-accion.repository";
import { obtenerFirestoreCliente } from "../../../infrastructure/firestore-client";
import { SystemClockAdapter } from "../../../infrastructure/adapters/system-clock.adapter";

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;
const SEMANAS_POR_TRIMESTRE = 13;

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    // `SectionGuard` redirige a /login antes de renderizar `children`;
    // este marcador nunca llega a mostrarse (Requirement 15.1, 23.2).
    contenido = <></>;
  } else {
    const db = obtenerFirestoreCliente();
    const consultarDashboard = crearConsultarDashboardUseCase({
      iglesias: new FirestoreIglesiaRepository(db),
      registros: new FirestoreRegistroSabaticoRepository(db),
      unidades: new FirestoreUnidadAccionRepository(db),
    });

    const hasta = new SystemClockAdapter().now();
    const desde = new Date(
      hasta.getTime() - SEMANAS_POR_TRIMESTRE * MS_POR_SEMANA
    );
    const resultado = await consultarDashboard(claims, { desde, hasta });

    contenido = resultado.ok ? (
      <DashboardAnalitico resultado={resultado.value} />
    ) : (
      <p role="alert">No se pudo cargar el Dashboard Analítico.</p>
    );
  }

  return <SectionGuard resource="dashboard">{contenido}</SectionGuard>;
}
