/**
 * `registrar-asistencia.use-case.ts` (Registro_Sabatico Core, Requerimiento
 * 7.1-7.7, 7.10, 14.4, 20.3, tareas 16.1 y 16.4).
 *
 * Caso de uso único que cubre AMBOS caminos descritos por el diseño para
 * la misma operación de "registrar asistencia":
 *
 * - **Creación** (tarea 16.1, Requirement 7.1, Property 21): si no existe
 *   un Registro_Sabatico con el ID determinístico
 *   `{iglesia_id}_{unidad_id}_{anio}_T{trimestre}_S{sabado}` para el
 *   Sabado_Eclesiastico vigente, se crea uno nuevo con `estado=borrador`,
 *   el mapa `asistencia` indexado por `participanteId`, y
 *   `totalesRapidos` consistentes desde el momento de su creación
 *   (Property 18). El mapa `asistencia` incluye únicamente a los
 *   Participantes de la Unidad con `estado=activo` (Requirement 6.4,
 *   Property 17): los Participantes inactivos quedan ausentes del mapa.
 *   Para cada Participante activo, el valor inicial de
 *   `presente`/`diasEstudio` proviene del DTO `cambios` si el Maestro ya
 *   lo incluyó en el mismo envío, o de un valor por defecto
 *   `{presente: false, diasEstudio: 0}` en caso contrario (aún no
 *   registrado).
 * - **Actualización** (tarea 16.4, Requirement 7.2-7.7): si el
 *   Registro_Sabatico ya existe, se aplica la guardia de estado editable
 *   (`verificarRegistroEditable`, rechaza si `estado=cerrado`, Requirement
 *   7.4) y se fusionan los `cambios` del DTO sobre el mapa `asistencia`
 *   existente, recalculando `codigoVisual` de cada Participante afectado y
 *   `totalesRapidos` del Registro completo (Property 22).
 *
 * En ambos caminos: autorización restringida a Secretario/Maestro sobre su
 * propia `iglesia_id` (o Admin_Global sin restricción, Requirement 7.3,
 * Property 2), MÁS la regla de dominio adicional de que un Maestro solo
 * puede operar sobre una Unidad_Accion a su cargo (`unidad.maestroUid ===
 * actorClaims.uid`, Requirement 7.3) — verificación que excede lo que
 * `ResourceScope`/`PERMISSION_MATRIX` puede expresar (solo conoce
 * `iglesiaId`, no la propiedad de la Unidad), por lo que se resuelve en
 * `applyDomainRule`. Rango de `diasEstudio` validado vía
 * `validarDiasEstudio` (Requirement 7.5, Property 23). Ausencia de zona
 * horaria configurada en la Iglesia rechaza la operación (Requirement
 * 20.3, Property 49), delegado en `calcularSabadoEclesiastico`.
 *
 * `PERMISSION_MATRIX` otorga la misma fila `["secretario", "maestro"],
 * "registro_sabatico", ["crear", "actualizar"], "own_iglesia"` para ambas
 * operaciones; se usa `operation: "actualizar"` en la configuración del
 * wrapper como representación única de este caso de uso combinado (el
 * resultado de autorización es idéntico para "crear" en esta tabla).
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 6.4, 20.3
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err, isErr } from "../../../domain/shared";
import {
  authorizationError,
  notFoundError,
} from "../../../domain/shared/domain-error";
import { calcularSabadoEclesiastico } from "../../../domain/services/calcular-sabado-eclesiastico";
import { calcularCodigoVisual } from "../../../domain/services/codigo-visual";
import { calcularTotalesRapidos } from "../../../domain/services/calcular-totales-rapidos";
import { validarDiasEstudio } from "../../../domain/services/validar-dias-estudio";
import { verificarRegistroEditable } from "../../../domain/services/verificar-registro-editable";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  RegistrarAsistenciaSchema,
  type RegistrarAsistenciaDto,
} from "../../dto/registro-sabatico.schema";
import type {
  AsistenciaParticipante,
  RegistroSabatico,
} from "../../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { UnidadAccionRepositoryPort } from "../../ports/unidad-accion.repository.port";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";
import type { ClockPort } from "../../ports/clock.port";

export interface RegistrarAsistenciaDeps {
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly participantes: ParticipanteRepositoryPort;
  readonly unidades: UnidadAccionRepositoryPort;
  readonly iglesias: IglesiaRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
  readonly clock: ClockPort;
}

export function crearRegistrarAsistenciaUseCase(
  deps: RegistrarAsistenciaDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<RegistrarAsistenciaDto, RegistroSabatico>(
      {
        schema: RegistrarAsistenciaSchema,
        resource: "registro_sabatico",
        operation: "actualizar",
        scopeOf: (data) => ({ iglesiaId: data.iglesiaId }),
        canPerform,
        applyDomainRule: async (data, actor) => {
          const iglesia = await deps.iglesias.findById(data.iglesiaId);
          if (iglesia === null) {
            return err(
              notFoundError(
                `La Iglesia "${data.iglesiaId}" no existe.`,
                data.iglesiaId
              )
            );
          }

          const unidad = await deps.unidades.findById(data.unidadId);
          if (unidad === null || unidad.iglesiaId !== data.iglesiaId) {
            return err(
              notFoundError(
                `La Unidad_Accion "${data.unidadId}" no existe.`,
                data.unidadId
              )
            );
          }
          // Requirement 7.3: un Maestro solo opera sobre Unidades a su cargo.
          if (actor.role === "maestro" && unidad.maestroUid !== actor.uid) {
            return err(authorizationError());
          }

          const sabadoResult = calcularSabadoEclesiastico(
            data.fechaReferencia,
            iglesia.timezone
          );
          if (isErr(sabadoResult)) {
            return sabadoResult;
          }
          const sabado = sabadoResult.value;
          const id = `${data.iglesiaId}_${data.unidadId}_${sabado.anio}_T${sabado.numeroTrimestre}_S${sabado.numeroSabado}`;

          const participantesUnidad = await deps.participantes.listByUnidad(
            data.unidadId
          );
          const esVisitaPorId = new Map(
            participantesUnidad.map((p) => [p.id, p.esVisita])
          );

          const existente = await deps.registros.findById(id);
          const ahora = deps.clock.now();

          if (existente === null) {
            // Camino de creación (Requirement 7.1, Property 21).
            const cambiosPorId = new Map(
              data.cambios.map((c) => [c.participanteId, c])
            );
            const asistencia: Record<string, AsistenciaParticipante> = {};

            for (const participante of participantesUnidad) {
              // Requirement 6.4, Property 17: excluir Participantes inactivos.
              if (participante.estado !== "activo") {
                continue;
              }
              const cambio = cambiosPorId.get(participante.id);
              const diasEstudioResult = validarDiasEstudio(
                cambio?.diasEstudio ?? 0
              );
              if (isErr(diasEstudioResult)) {
                return diasEstudioResult;
              }
              const presente = cambio?.presente ?? false;
              const diasEstudio = diasEstudioResult.value;
              asistencia[participante.id] = {
                presente,
                diasEstudio,
                autorregistrado: false,
                codigoVisual: calcularCodigoVisual({
                  presente,
                  diasEstudio,
                  esVisita: participante.esVisita,
                }),
                seguimientoPastoral: [],
              };
            }

            const totalesRapidos = calcularTotalesRapidos(
              Object.fromEntries(
                Object.entries(asistencia).map(([pid, a]) => [
                  pid,
                  { presente: a.presente, esVisita: esVisitaPorId.get(pid) ?? false },
                ])
              )
            );

            return ok<RegistroSabatico>({
              id,
              iglesiaId: data.iglesiaId,
              unidadId: data.unidadId,
              sabadoEclesiastico: sabado,
              estado: "borrador",
              asistencia,
              totalesRapidos,
              creadoEn: ahora,
              actualizadoEn: ahora,
            });
          }

          // Camino de actualización (Requirement 7.2-7.7, Property 22).
          const editable = verificarRegistroEditable(existente);
          if (isErr(editable)) {
            return editable;
          }

          const nuevaAsistencia: Record<string, AsistenciaParticipante> = {
            ...existente.asistencia,
          };

          for (const cambio of data.cambios) {
            if (!esVisitaPorId.has(cambio.participanteId)) {
              return err(
                notFoundError(
                  `El Participante "${cambio.participanteId}" no pertenece a la Unidad_Accion "${data.unidadId}".`,
                  cambio.participanteId
                )
              );
            }
            const diasEstudioResult = validarDiasEstudio(cambio.diasEstudio);
            if (isErr(diasEstudioResult)) {
              return diasEstudioResult;
            }
            const diasEstudio = diasEstudioResult.value;
            const seguimientoPastoralPrevio =
              nuevaAsistencia[cambio.participanteId]?.seguimientoPastoral ?? [];
            nuevaAsistencia[cambio.participanteId] = {
              presente: cambio.presente,
              diasEstudio,
              autorregistrado: false,
              codigoVisual: calcularCodigoVisual({
                presente: cambio.presente,
                diasEstudio,
                esVisita: esVisitaPorId.get(cambio.participanteId) ?? false,
              }),
              seguimientoPastoral: seguimientoPastoralPrevio,
            };
          }

          const totalesRapidos = calcularTotalesRapidos(
            Object.fromEntries(
              Object.entries(nuevaAsistencia).map(([pid, a]) => [
                pid,
                { presente: a.presente, esVisita: esVisitaPorId.get(pid) ?? false },
              ])
            )
          );

          return ok<RegistroSabatico>({
            ...existente,
            asistencia: nuevaAsistencia,
            totalesRapidos,
            actualizadoEn: ahora,
          });
        },
        save: (value) => deps.registros.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "registrar_asistencia",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}
