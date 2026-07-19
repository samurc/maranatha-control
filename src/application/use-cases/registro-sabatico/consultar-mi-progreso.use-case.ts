/**
 * `consultar-mi-progreso.use-case.ts` (Requerimiento 10.6, tarea 20.5,
 * Property 29).
 *
 * Un Alumno consulta su propio estado de asistencia/estudio diario del
 * Sabado_Eclesiastico vigente, más metas agregadas y anónimas de su
 * Unidad_Accion (promedio de `diasEstudio` y proporción de presentes del
 * Registro_Sabatico completo), sin exponer ningún dato individual de
 * otros Participantes.
 *
 * Caso de uso de solo lectura: no usa `ejecutarCasoDeUso`.
 *
 * Validates: Requirements 10.6
 */

import {
  type Result,
  type DomainError,
  ok,
  err,
  validationError,
  authorizationError,
  notFoundError,
} from "../../../domain/shared";
import { calcularSabadoEclesiastico } from "../../../domain/services/calcular-sabado-eclesiastico";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import { ConsultarMiProgresoSchema } from "../../dto/estudio-diario.schema";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { ParticipanteRepositoryPort } from "../../ports/participante.repository.port";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";

/** Mi propio estado (Requirement 10.6, primera mitad). */
export interface MiEstadoPropio {
  readonly presente: boolean;
  readonly diasEstudio: number;
  readonly codigoVisual: string;
}

/** Metas agregadas y anónimas de mi Unidad_Accion (Requirement 10.6, segunda mitad). */
export interface MetasAgregadasUnidad {
  readonly totalParticipantes: number;
  readonly promedioDiasEstudio: number;
  readonly proporcionPresentes: number;
}

/**
 * Entrada de asistencia histórica de un único sábado, para la propia
 * asistencia del Alumno únicamente (Requirement 15.3: "asistencia
 * histórica"). No incluye datos de ningún otro Participante.
 */
export interface AsistenciaHistoricaEntry {
  readonly fechaISO: string;
  readonly presente: boolean;
  readonly diasEstudio: number;
  readonly codigoVisual: string;
}

export interface MiProgreso {
  readonly miEstado: MiEstadoPropio;
  readonly metasAgregadas: MetasAgregadasUnidad;
  /** Ordenado cronológicamente ascendente (Requirement 15.3). */
  readonly asistenciaHistorica: readonly AsistenciaHistoricaEntry[];
}

export interface ConsultarMiProgresoDeps {
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly participantes: ParticipanteRepositoryPort;
  readonly iglesias: IglesiaRepositoryPort;
}

export function crearConsultarMiProgresoUseCase(
  deps: ConsultarMiProgresoDeps
) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<MiProgreso, DomainError>> {
    const dto = ConsultarMiProgresoSchema.safeParse(input);
    if (!dto.success) {
      return err(
        validationError(
          "El DTO de entrada no cumple con el esquema esperado.",
          dto.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          }))
        )
      );
    }

    if (actorClaims.role !== "alumno") {
      return err(authorizationError());
    }

    const participante = await deps.participantes.findByUserUid(
      actorClaims.uid
    );
    if (participante === null) {
      return err(
        notFoundError(
          "No hay ningún Participante vinculado a este usuario."
        )
      );
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
      dto.data.fechaReferencia,
      iglesia.timezone
    );
    if (sabadoResult.ok === false) {
      return err(sabadoResult.error);
    }
    const sabado = sabadoResult.value;
    const registroId = `${participante.iglesiaId}_${participante.unidadId}_${sabado.anio}_T${sabado.numeroTrimestre}_S${sabado.numeroSabado}`;

    const registro = await deps.registros.findById(registroId);
    if (registro === null) {
      return err(
        notFoundError(
          "Aún no existe un Registro_Sabatico para el sábado en curso de tu Unidad_Accion.",
          registroId
        )
      );
    }

    const miAsistencia = registro.asistencia[participante.id];
    if (miAsistencia === undefined) {
      return err(
        notFoundError(
          "No estás registrado en el Registro_Sabatico del sábado en curso."
        )
      );
    }

    const entradas = Object.values(registro.asistencia);
    const totalParticipantes = entradas.length;
    const sumaDiasEstudio = entradas.reduce((acc, a) => acc + a.diasEstudio, 0);
    const totalPresentes = entradas.filter((a) => a.presente).length;

    // Requirement 15.3: asistencia histórica del propio Alumno únicamente,
    // a través de TODOS los Registros_Sabaticos de su Unidad_Accion (no
    // solo el sábado vigente).
    const registrosUnidad = await deps.registros.listByUnidad(
      participante.unidadId
    );
    const asistenciaHistorica: AsistenciaHistoricaEntry[] = registrosUnidad
      .filter((r) => r.asistencia[participante.id] !== undefined)
      .map((r) => {
        const entrada = r.asistencia[participante.id];
        return {
          fechaISO: r.sabadoEclesiastico.fechaISO,
          presente: entrada!.presente,
          diasEstudio: entrada!.diasEstudio,
          codigoVisual: entrada!.codigoVisual,
        };
      })
      .sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));

    return ok({
      miEstado: {
        presente: miAsistencia.presente,
        diasEstudio: miAsistencia.diasEstudio,
        codigoVisual: miAsistencia.codigoVisual,
      },
      metasAgregadas: {
        totalParticipantes,
        promedioDiasEstudio:
          totalParticipantes === 0 ? 0 : sumaDiasEstudio / totalParticipantes,
        proporcionPresentes:
          totalParticipantes === 0 ? 0 : totalPresentes / totalParticipantes,
      },
      asistenciaHistorica,
    });
  };
}
