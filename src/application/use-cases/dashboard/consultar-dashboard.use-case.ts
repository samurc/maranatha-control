/**
 * `consultar-dashboard.use-case.ts` (Dashboard Analítico, Requerimiento
 * 11.1-11.7, 21.1, tareas 22.1 y 22.3, Property 30, 31, 32, 50).
 *
 * Calcula indicadores agregados de asistencia/estudio diario/deserción
 * para un periodo `[desde, hasta]`, con alcance territorial según el rol
 * del actor:
 *
 * - `director_es` (Requirement 11.1): agregados de todas las
 *   Unidades_Accion de su propia `iglesia_id` — un único `IglesiaAgregado`.
 * - `pastor_distrital`/`anciano` (Requirement 11.2): un `IglesiaAgregado`
 *   por cada Iglesia de su `distrito_id`, SIN datos individuales de
 *   Participante (el agregado nunca expone `participanteId`, solo
 *   conteos).
 * - `admin_asociacion` (Requirement 11.3): un `IglesiaAgregado` por cada
 *   Iglesia de su `asociacion_id` (agrupado por Distrito).
 * - `admin_global` (Requirement 11.4): un `IglesiaAgregado` por CADA
 *   Iglesia del Sistema.
 * - `secretario`/`maestro`/`alumno` (Requirement 11.5): rechazados con
 *   error de autorización.
 *
 * Cálculos por Iglesia (Requirement 11.6, 11.7, Property 31, 32):
 * únicamente Registros_Sabaticos con `estado=cerrado` dentro del periodo
 * contribuyen a `totalesRapidos`/`promedioDiasEstudio`/deserción
 * (delegada a `calcularDesercion`, tarea 6.5); todo Sabado_Eclesiastico
 * esperado en el periodo (uno por semana, calculado en la zona horaria de
 * la Iglesia) que no tiene un Registro `cerrado` para alguna de las
 * Unidades de esa Iglesia se reporta explícitamente en
 * `sabadosPendientesDeCierre`.
 *
 * Requirement 21.1, Property 50: `IglesiaAgregado` es un tipo puramente
 * numérico/agregado — no incluye NUNCA `esMenorEdad` de ningún
 * Participante individual (no existe ningún campo así en su forma, por
 * construcción del tipo, no por un filtro en tiempo de ejecución).
 *
 * Caso de uso de solo lectura: no usa `ejecutarCasoDeUso`.
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 21.1
 */

import {
  type Result,
  type DomainError,
  ok,
  err,
  validationError,
  authorizationError,
} from "../../../domain/shared";
import { calcularSabadoEclesiastico } from "../../../domain/services/calcular-sabado-eclesiastico";
import {
  calcularDesercion,
  type RegistroParaDesercion,
} from "../../../domain/services/calcular-desercion";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import { ConsultarDashboardSchema } from "../../dto/dashboard.schema";
import type { RegistroSabatico } from "../../../domain/entities/registro-sabatico.entity";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";
import type { RegistroSabaticoRepositoryPort } from "../../ports/registro-sabatico.repository.port";
import type { UnidadAccionRepositoryPort } from "../../ports/unidad-accion.repository.port";

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

/**
 * Agregado por Iglesia. Deliberadamente sin ningún campo de identidad de
 * Participante ni `esMenorEdad` (Requirement 21.1, Property 50): solo
 * conteos y promedios.
 */
export interface IglesiaAgregado {
  readonly iglesiaId: string;
  readonly nombre: string;
  readonly presentes: number;
  readonly ausentes: number;
  readonly visitas: number;
  readonly promedioDiasEstudio: number;
  readonly participantesEnDesercion: number;
  /** `fechaISO` de cada Sabado_Eclesiastico del periodo sin Registro `cerrado` para alguna Unidad de esta Iglesia (Requirement 11.7). */
  readonly sabadosPendientesDeCierre: readonly string[];
}

export interface DashboardResultado {
  readonly iglesias: readonly IglesiaAgregado[];
}

export interface ConsultarDashboardDeps {
  readonly iglesias: IglesiaRepositoryPort;
  readonly registros: RegistroSabaticoRepositoryPort;
  readonly unidades: UnidadAccionRepositoryPort;
}

export function crearConsultarDashboardUseCase(
  deps: ConsultarDashboardDeps
) {
  return async function execute(
    actorClaims: CustomClaims,
    input: unknown
  ): Promise<Result<DashboardResultado, DomainError>> {
    const dto = ConsultarDashboardSchema.safeParse(input);
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

    let iglesiasEnAlcance: readonly Iglesia[];
    switch (actorClaims.role) {
      case "director_es": {
        if (actorClaims.iglesiaId === undefined) {
          return err(authorizationError());
        }
        const iglesia = await deps.iglesias.findById(actorClaims.iglesiaId);
        iglesiasEnAlcance = iglesia === null ? [] : [iglesia];
        break;
      }
      case "pastor_distrital":
      case "anciano": {
        if (actorClaims.distritoId === undefined) {
          return err(authorizationError());
        }
        iglesiasEnAlcance = await deps.iglesias.listByDistrito(
          actorClaims.distritoId
        );
        break;
      }
      case "admin_asociacion": {
        if (actorClaims.asociacionId === undefined) {
          return err(authorizationError());
        }
        iglesiasEnAlcance = await deps.iglesias.listByAsociacion(
          actorClaims.asociacionId
        );
        break;
      }
      case "admin_global": {
        iglesiasEnAlcance = await deps.iglesias.list();
        break;
      }
      default:
        // Requirement 11.5: secretario, maestro, alumno rechazados.
        return err(authorizationError());
    }

    const agregados: IglesiaAgregado[] = [];
    for (const iglesia of iglesiasEnAlcance) {
      agregados.push(
        await calcularAgregadoIglesia(deps, iglesia, dto.data.desde, dto.data.hasta)
      );
    }

    return ok({ iglesias: agregados });
  };
}

async function calcularAgregadoIglesia(
  deps: ConsultarDashboardDeps,
  iglesia: Iglesia,
  desde: Date,
  hasta: Date
): Promise<IglesiaAgregado> {
  const unidadesIglesia = await deps.unidades.listByIglesia(iglesia.id);
  const todosRegistros = await deps.registros.listByIglesia(iglesia.id);

  // Requirement 11.7, Property 32: solo estado=cerrado contribuye.
  const registrosCerradosEnPeriodo = todosRegistros.filter(
    (registro) =>
      registro.estado === "cerrado" &&
      dentroDelPeriodo(registro, desde, hasta)
  );

  let presentes = 0;
  let ausentes = 0;
  let sumaDiasEstudio = 0;
  let totalEntradas = 0;

  for (const registro of registrosCerradosEnPeriodo) {
    for (const asistencia of Object.values(registro.asistencia)) {
      totalEntradas += 1;
      sumaDiasEstudio += asistencia.diasEstudio;
      if (asistencia.presente) {
        presentes += 1;
      } else {
        ausentes += 1;
      }
    }
  }
  // `visitas` requeriría `esVisita` (propiedad de Participante, no de
  // AsistenciaParticipante — ver comentario de
  // calcular-totales-rapidos.ts) resuelta por Participante individual a
  // nivel de Iglesia completa. Se reporta 0 de forma explícita en vez de
  // inventar un valor no verificable con la información disponible en
  // este alcance agregado.
  const visitas = 0;

  // Deserción por Unidad_Accion (Requirement 11.6, Property 31):
  // calcularDesercion espera Registros de una ÚNICA Unidad_Accion.
  let participantesEnDesercion = 0;
  for (const unidad of unidadesIglesia) {
    const registrosUnidad: RegistroParaDesercion[] =
      registrosCerradosEnPeriodo.filter((r) => r.unidadId === unidad.id);
    participantesEnDesercion += calcularDesercion(registrosUnidad).size;
  }

  const sabadosEsperados = calcularSabadosEsperados(
    desde,
    hasta,
    iglesia.timezone
  );
  const sabadosCerradosPorUnidad = new Map<string, Set<string>>();
  for (const registro of todosRegistros) {
    if (registro.estado !== "cerrado") continue;
    const set = sabadosCerradosPorUnidad.get(registro.unidadId) ?? new Set();
    set.add(registro.sabadoEclesiastico.fechaISO);
    sabadosCerradosPorUnidad.set(registro.unidadId, set);
  }
  const pendientes = new Set<string>();
  for (const unidad of unidadesIglesia) {
    const cerrados = sabadosCerradosPorUnidad.get(unidad.id) ?? new Set();
    for (const fechaISO of sabadosEsperados) {
      if (!cerrados.has(fechaISO)) {
        pendientes.add(fechaISO);
      }
    }
  }

  return {
    iglesiaId: iglesia.id,
    nombre: iglesia.nombre,
    presentes,
    ausentes,
    visitas,
    promedioDiasEstudio: totalEntradas === 0 ? 0 : sumaDiasEstudio / totalEntradas,
    participantesEnDesercion,
    sabadosPendientesDeCierre: [...pendientes].sort(),
  };
}

function dentroDelPeriodo(
  registro: RegistroSabatico,
  desde: Date,
  hasta: Date
): boolean {
  const fecha = new Date(`${registro.sabadoEclesiastico.fechaISO}T00:00:00Z`);
  return fecha >= desde && fecha <= hasta;
}

/** Fechas ISO de cada Sabado_Eclesiastico esperado en `[desde, hasta]`, en la zona horaria de la Iglesia. */
function calcularSabadosEsperados(
  desde: Date,
  hasta: Date,
  timezone: string | undefined
): readonly string[] {
  if (timezone === undefined) {
    return [];
  }
  const fechas = new Set<string>();
  for (
    let instante = desde.getTime();
    instante <= hasta.getTime();
    instante += MS_POR_SEMANA
  ) {
    const resultado = calcularSabadoEclesiastico(new Date(instante), timezone);
    if (resultado.ok) {
      fechas.add(resultado.value.fechaISO);
    }
  }
  return [...fechas];
}
