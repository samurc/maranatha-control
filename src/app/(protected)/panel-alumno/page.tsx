/**
 * `(protected)/panel-alumno/page.tsx` (Requerimiento 23.1, 23.2, tarea
 * 43.3).
 *
 * Monta `<SectionGuard resource="participante">` alrededor de
 * `<PanelAlumno>`, con los datos resueltos por
 * `consultar-mi-progreso.use-case.ts` (Requirement 10.6, 15.3). El
 * `resource="participante"` coincide con el recurso que
 * `PERMISSION_MATRIX` otorga a `alumno` con alcance `"self"` (el propio
 * Participante vinculado, ver `domain/rbac/rbac-engine.ts`).
 */
import { SectionGuard } from "../../../presentation/components/section-guard";
import { PanelAlumno } from "../../../presentation/components/panel-alumno";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { crearConsultarMiProgresoUseCase } from "../../../application/use-cases/registro-sabatico/consultar-mi-progreso.use-case";
import { FirestoreIglesiaRepository } from "../../../infrastructure/repositories/firestore-iglesia.repository";
import { FirestoreParticipanteRepository } from "../../../infrastructure/repositories/firestore-participante.repository";
import { FirestoreRegistroSabaticoRepository } from "../../../infrastructure/repositories/firestore-registro-sabatico.repository";
import { obtenerFirestoreCliente } from "../../../infrastructure/firestore-client";
import { SystemClockAdapter } from "../../../infrastructure/adapters/system-clock.adapter";

export default async function PanelAlumnoPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreCliente();
    const consultarMiProgreso = crearConsultarMiProgresoUseCase({
      registros: new FirestoreRegistroSabaticoRepository(db),
      participantes: new FirestoreParticipanteRepository(db),
      iglesias: new FirestoreIglesiaRepository(db),
    });

    const fechaReferencia = new SystemClockAdapter().now();
    const resultado = await consultarMiProgreso(claims, { fechaReferencia });

    contenido = resultado.ok ? (
      <PanelAlumno progreso={resultado.value} />
    ) : (
      <p role="alert">No se pudo cargar tu progreso.</p>
    );
  }

  return <SectionGuard resource="participante">{contenido}</SectionGuard>;
}
