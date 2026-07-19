/**
 * `(protected)/unidades/[unidadId]/registro/page.tsx` (Requerimiento
 * 23.1, 23.2, tarea 43.4).
 *
 * Monta `<SectionGuard resource="registro_sabatico">` alrededor de
 * `<InterfazGrillaAsistencia>` para el `unidadId` del segmento dinámico.
 * Resuelve el Registro_Sabatico vigente de la Unidad (si existe) para
 * construir el `estadoInicial` de la grilla y la lista de Participantes
 * activos; el guardado se delega a `registrarAsistenciaAction`
 * (`actions.ts`, Server Function).
 */
import { SectionGuard } from "../../../../../presentation/components/section-guard";
import {
  InterfazGrillaAsistencia,
  type ParticipanteGrilla,
} from "../../../../../presentation/grilla-asistencia/interfaz-grilla-asistencia";
import type { GridState } from "../../../../../presentation/grilla-asistencia/grid-state";
import { obtenerClaimsDeSesion } from "../../../../../presentation/session";
import { calcularSabadoEclesiastico } from "../../../../../domain/services/calcular-sabado-eclesiastico";
import { FirestoreIglesiaRepository } from "../../../../../infrastructure/repositories/firestore-iglesia.repository";
import { FirestoreParticipanteRepository } from "../../../../../infrastructure/repositories/firestore-participante.repository";
import { FirestoreRegistroSabaticoRepository } from "../../../../../infrastructure/repositories/firestore-registro-sabatico.repository";
import { FirestoreUnidadAccionRepository } from "../../../../../infrastructure/repositories/firestore-unidad-accion.repository";
import { obtenerFirestoreCliente } from "../../../../../infrastructure/firestore-client";
import { SystemClockAdapter } from "../../../../../infrastructure/adapters/system-clock.adapter";
import { registrarAsistenciaAction } from "./actions";

interface RegistroPageProps {
  readonly params: Promise<{ unidadId: string }>;
}

export default async function RegistroPage({
  params,
}: RegistroPageProps): Promise<React.JSX.Element> {
  const { unidadId } = await params;
  const claims = await obtenerClaimsDeSesion();

  let contenido: React.JSX.Element;
  let fechaReferencia = new SystemClockAdapter().now();

  if (claims === null) {
    contenido = <></>;
  } else {
    const db = obtenerFirestoreCliente();
    const unidades = new FirestoreUnidadAccionRepository(db);
    const iglesias = new FirestoreIglesiaRepository(db);
    const participantesRepo = new FirestoreParticipanteRepository(db);
    const registrosRepo = new FirestoreRegistroSabaticoRepository(db);

    const unidad = await unidades.findById(unidadId);
    if (unidad === null) {
      contenido = <p role="alert">La Unidad_Accion no existe.</p>;
    } else {
      const iglesia = await iglesias.findById(unidad.iglesiaId);
      fechaReferencia = new SystemClockAdapter().now();
      const sabadoResult =
        iglesia === null
          ? null
          : calcularSabadoEclesiastico(fechaReferencia, iglesia.timezone);

      const participantesUnidad = (
        await participantesRepo.listByUnidad(unidadId)
      ).filter((p) => p.estado === "activo");
      const participantes: ParticipanteGrilla[] = participantesUnidad.map(
        (p) => ({
          participanteId: p.id,
          nombreCompleto: `${p.nombre} ${p.apellido}`,
        })
      );

      let estadoInicial: GridState = {};
      if (sabadoResult !== null && sabadoResult.ok) {
        const sabado = sabadoResult.value;
        const registroId = `${unidad.iglesiaId}_${unidadId}_${sabado.anio}_T${sabado.numeroTrimestre}_S${sabado.numeroSabado}`;
        const registro = await registrosRepo.findById(registroId);
        if (registro !== null) {
          const estado: Record<string, { presente: boolean; diasEstudio: number }> = {};
          for (const [participanteId, asistencia] of Object.entries(
            registro.asistencia
          )) {
            estado[participanteId] = {
              presente: asistencia.presente,
              diasEstudio: asistencia.diasEstudio,
            };
          }
          estadoInicial = estado;
        }
      }

      contenido = (
        <InterfazGrillaAsistencia
          participantes={participantes}
          estadoInicial={estadoInicial}
          contexto={{
            iglesiaId: unidad.iglesiaId,
            unidadId,
            fechaReferencia,
          }}
          onGuardar={registrarAsistenciaAction}
        />
      );
    }
  }

  return (
    <SectionGuard resource="registro_sabatico">{contenido}</SectionGuard>
  );
}
