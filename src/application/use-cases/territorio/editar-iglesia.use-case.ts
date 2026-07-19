/**
 * `editar-iglesia.use-case.ts` (Requerimiento 3.6, tarea 10.7, Property
 * 10).
 *
 * Actualiza únicamente los campos `nombre`, `distrito_id` o `pais_codigo`
 * de una Iglesia existente; el resto del documento permanece sin cambios
 * (Property 10: "actualizar únicamente esos campos y preservar el resto
 * del documento sin cambios"). Autorizado a `admin_global`/
 * `admin_asociacion` sobre su propia `asociacion_id` (misma fila de
 * `PERMISSION_MATRIX` que `crear`, tarea 4.1: `["admin_asociacion"],
 * "iglesia", ["crear", "actualizar"], "own_asociacion"`).
 *
 * Regla de dominio adicional: la Iglesia objetivo debe existir
 * (`no_encontrado` en caso contrario).
 *
 * Validates: Requirements 3.6
 */

import { ejecutarCasoDeUso } from "../../shared/execute-use-case";
import { registrarEventoAuditoria } from "../../shared/registrar-evento-auditoria";
import { canPerform } from "../../../domain/rbac/rbac-engine";
import { ok, err } from "../../../domain/shared";
import { notFoundError } from "../../../domain/shared/domain-error";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";
import {
  EditarIglesiaSchema,
  type EditarIglesiaDto,
} from "../../dto/territorio.schema";
import type { Iglesia } from "../../../domain/entities/iglesia.entity";
import type { IglesiaRepositoryPort } from "../../ports/iglesia.repository.port";
import type { AuditoriaRepositoryPort } from "../../ports/auditoria.repository.port";

export interface EditarIglesiaDeps {
  readonly iglesias: IglesiaRepositoryPort;
  readonly auditoria: AuditoriaRepositoryPort;
}

export function crearEditarIglesiaUseCase(deps: EditarIglesiaDeps) {
  return function execute(actorClaims: CustomClaims, input: unknown) {
    return ejecutarCasoDeUso<EditarIglesiaDto, Iglesia>(
      {
        schema: EditarIglesiaSchema,
        resource: "iglesia",
        operation: "actualizar",
        // El scope de autorización de la operación de edición se evalúa
        // contra la asociacion_id ACTUAL de la Iglesia (no viaja en el
        // DTO de edición); se resuelve en applyDomainRule tras cargarla,
        // pero canPerform necesita un scope antes de eso. Como
        // `editar-iglesia` no permite cambiar `asociacionId`, el propio
        // documento existente decide el scope real dentro de
        // applyDomainRule (segunda verificación de autorización,
        // redundante con Property 1/10 pero necesaria porque el DTO no
        // trae asociacionId). Para no autorizar de más aquí, exigimos
        // `admin_global` o `admin_asociacion` sin restricción de scope en
        // este primer paso, y la restricción territorial exacta se aplica
        // como regla de dominio tras leer el documento.
        scopeOf: () => ({}),
        canPerform: (claims, resource, operation) =>
          claims.role === "admin_global" || claims.role === "admin_asociacion"
            ? canPerform(claims, resource, operation, {
                asociacionId: claims.asociacionId,
              })
            : false,
        applyDomainRule: async (data, actor) => {
          const iglesia = await deps.iglesias.findById(data.id);
          if (iglesia === null) {
            return err(
              notFoundError(`La Iglesia "${data.id}" no existe.`, data.id)
            );
          }
          if (
            actor.role === "admin_asociacion" &&
            iglesia.asociacionId !== actor.asociacionId
          ) {
            return err(
              notFoundError(`La Iglesia "${data.id}" no existe.`, data.id)
            );
          }
          return ok<Iglesia>({
            ...iglesia,
            nombre: data.nombre ?? iglesia.nombre,
            distritoId: data.distritoId ?? iglesia.distritoId,
            paisCodigo: data.paisCodigo ?? iglesia.paisCodigo,
          });
        },
        save: (value) => deps.iglesias.save(value),
        registrarAuditoria: registrarEventoAuditoria(deps.auditoria),
        accion: "editar_iglesia",
        recursoAfectadoOf: (value) => value.id,
      },
      actorClaims,
      input
    );
  };
}
