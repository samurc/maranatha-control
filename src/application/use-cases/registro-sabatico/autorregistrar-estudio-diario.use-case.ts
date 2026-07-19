/**
 * `autorregistrar-estudio-diario.use-case.ts` (Requerimiento 10.1-10.3,
 * 10.5, tarea 20.1).
 *
 * Un Alumno incrementa en uno su propio `diasEstudio` del sábado en curso,
 * con `autorregistrado=true` (Requirement 10.1, Property 26). Se rechaza
 * un segundo Autorregistro para el mismo día calendario (Requirement
 * 10.2, Property 27) — la detección de "mismo día calendario" se
 * modela con un campo auxiliar `ultimoAutorregistroFechaISO` guardado en
 * la propia entrada de asistencia (ver comentario de campo más abajo),
 * comparado en la zona horaria de la Iglesia via `calcularSabadoEclesiastico`
 * (que ya expone `fechaISO` civil en esa zona horaria). Solo el Alumno
 * vinculado puede autorregistrarse sobre su propio Participante
 * (Requirement 10.3, Property 28); ningún otro rol usa este caso de uso
 * (el registro manual de un Maestro usa `registrar-asistencia.use-case.ts`
 * con `autorregistrado=false`, Property 26). Guardia de estado editable
 * (Requirement 10.5, Property 19).
 *
 * Nota de diseño: `AsistenciaParticipante` (design.md) no define un campo
 * explícito para "último día de autorregistro"; se necesita alguno para
 * detectar el duplicado del MISMO día sin depender de un contador externo.
 * Se reutiliza `RegistroSabatico.sabadoEclesiastico.fechaISO` como ancla:
 * como todo Autorregistro ocurre durante la semana de un ÚNICO
 * Sabado_Eclesiastico (el "en curso"), el mismo Registro_Sabatico nunca
 * cubre dos días calendario iguales en llamadas distintas de esta función
 * salvo que sean, en efecto, el mismo día — por lo que la marca de
 * duplicado se guarda como una propiedad ad hoc `ultimoAutorregistroFechaISO`
 * en la extensión local `AsistenciaConAutorregistro` de este archivo (no
 * en la entidad de dominio compartida), y se persiste igual que cualquier
 * otro campo de `AsistenciaParticipante` gracias a que TypeScript permite
 * campos adicionales en objetos estructuralmente compatibles. Esta
 * decisión se documenta explícitamente para que la tarea 26.3
 * (repositorio Firestore) sepa serializar/deserializar este campo.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { ok, err, isErr } from "../../../domain/shared";
import {
  authorizationError,
  conflictError,
  notFoundError,
} from "../../../domain/shared/domain-error";
import { calcularSabadoEclesiastico } from "../../../domain/services/calcular-sabado-eclesiastico";
import { calcularCodigoVisual } from "../../../domain/services/codigo-visual";
import { validarDiasEstudio } from "../../../domain/services/validar-dias-estudio";
import { verificarRegistroEditable } from "../../../domain/services/verificar-registro-editable";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  AutorregistrarEstudioDiarioSchema,
  type AutorregistrarEstudioDiarioDto,
} from "../../dto/estudio-diario.schema";
import type {
  AsistenciaParticipante,
  RegistroSabatico,
} from "../../../domain/entities/registro-sabatico.entity";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

/** Extensión ad hoc de `AsistenciaParticipante` para detectar duplicados del mismo día (ver comentario de módulo). */
interface AsistenciaConAutorregistro extends AsistenciaParticipante {
  readonly ultimoAutorregistroFechaISO?: string;
}

export interface AutorregistrarEstudioDiarioDeps {
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly participantes: ParticipanteRepositoryPort;
  readonly iglesias: IglesiaRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearAutorregistrarEstudioDiarioUseCase(
  deps: AutorregistrarEstudioDiarioDeps
) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<AutorregistrarEstudioDiarioDto, RegistroSabatico>(
      {
        schema: AutorregistrarEstudioDiarioSchema,
        resource: "registro_sabatico",
        operation: "actualizar",
        scopeOf: () => ({ iglesiaId: actorClaims.iglesiaId }),
        // Requirement 10.3, Property 28: solo un Alumno puede autorregistrarse.
        canPerform: (claims) => claims.role === "alumno",
        applyDomainRule: async (data, actor) => {
          const participante = await deps.participantes.findById(
            data.participanteId
          );
          if (participante === null) {
            return err(
              notFoundError(
                `El Participante "${data.participanteId}" no existe.`,
                data.participanteId
              )
            );
          }
          if (participante.userUid !== actor.uid) {
            return err(authorizationError());
          }

          const iglesia = await deps.iglesias.findById(participante.iglesiaId);
          if (iglesia === null) {
            return err(
              notFoundError(
                `La Iglesia "${participante.iglesiaId}" no existe.`,
                participante.iglesiaId
              )
            );
          }

          const sabadoResult = calcularSabadoEclesiastico(
            data.fechaReferencia,
            iglesia.timezone
          );
          if (isErr(sabadoResult)) {
            return sabadoResult;
          }
          const sabado = sabadoResult.value;
          const id = `${participante.iglesiaId}_${participante.unidadId}_${sabado.anio}_T${sabado.numeroTrimestre}_S${sabado.numeroSabado}`;

          const registro = await deps.registros.findById(id);
          if (registro === null) {
            return err(
              notFoundError(
                `Aún no existe un Registro_Sabatico para el sábado en curso de la Unidad_Accion "${participante.unidadId}".`,
                id
              )
            );
          }

          const editable = verificarRegistroEditable(registro);
          if (isErr(editable)) {
            return editable;
          }

          const previa = registro.asistencia[
            participante.id
          ] as AsistenciaConAutorregistro | undefined;
          if (previa === undefined) {
            return err(
              notFoundError(
                `El Participante "${participante.id}" no está registrado en este Registro_Sabatico.`,
                participante.id
              )
            );
          }

          // Requirement 10.2, Property 27: un único Autorregistro por día calendario.
          const hoyISO = calendarioDelDiaVigente(data.fechaReferencia, iglesia.timezone as string);
          if (previa.ultimoAutorregistroFechaISO === hoyISO) {
            return err(
              conflictError(
                "Ya se realizó un Autorregistro de estudio diario para el día de hoy."
              )
            );
          }

          const diasEstudioResult = validarDiasEstudio(previa.diasEstudio + 1);
          if (isErr(diasEstudioResult)) {
            return diasEstudioResult;
          }
          const diasEstudio = diasEstudioResult.value;

          const nuevaEntrada: AsistenciaConAutorregistro = {
            ...previa,
            diasEstudio,
            autorregistrado: true,
            codigoVisual: calcularCodigoVisual({
              presente: previa.presente,
              diasEstudio,
              esVisita: participante.esVisita,
            }),
            ultimoAutorregistroFechaISO: hoyISO,
          };

          return ok<RegistroSabatico>({
            ...registro,
            asistencia: { ...registro.asistencia, [participante.id]: nuevaEntrada },
          });
        },
        save: (value) => deps.registros.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "autorregistrar_estudio_diario",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}

/** Fecha civil (`YYYY-MM-DD`) de `instante` en `timezone` (misma lógica de `calcularSabadoEclesiastico`). */
function calendarioDelDiaVigente(instante: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const partes = formatter.formatToParts(instante);
  const anio = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const dia = partes.find((p) => p.type === "day")?.value;
  return `${anio}-${mes}-${dia}`;
}
