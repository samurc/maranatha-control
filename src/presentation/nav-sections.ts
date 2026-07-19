/**
 * Construcción del menú de navegación (Requerimiento 15.4, tarea 34.4).
 *
 * Usa `visibleNavSections(claims)` (dominio puro, tarea 4.3) — la MISMA
 * tabla `PERMISSION_MATRIX` que el backend — para ocultar de la
 * navegación principal las secciones sin ningún permiso otorgado al
 * `role` del actor. Este módulo solo añade el mapeo de presentación
 * (etiqueta traducible, ruta) sobre el resultado de dominio; nunca
 * duplica la decisión de qué es visible (esa decisión vive únicamente en
 * `PERMISSION_MATRIX`).
 */
import { visibleNavSections } from "../domain/rbac/rbac-engine";
import type { CustomClaims } from "../domain/value-objects/custom-claims.vo";
import type { Resource } from "../domain/rbac/types";

export interface NavMenuItem {
  readonly resource: Resource;
  readonly etiqueta: string;
  readonly href: string;
}

/** Mapeo de presentación `Resource` -> etiqueta/ruta de UI. Recursos sin entrada aquí (p. ej. `custom_claims`, `datos_personales`) no tienen una sección de navegación propia. */
const METADATA_POR_RECURSO: Readonly<
  Partial<Record<Resource, { etiqueta: string; href: string }>>
> = {
  iglesia: { etiqueta: "Iglesias", href: "/iglesias" },
  distrito: { etiqueta: "Distritos", href: "/distritos" },
  asociacion: { etiqueta: "Asociaciones", href: "/asociaciones" },
  unidad_accion: { etiqueta: "Unidades de Acción", href: "/unidades" },
  participante: { etiqueta: "Participantes", href: "/participantes" },
  registro_sabatico: { etiqueta: "Registro Sabático", href: "/registros" },
  dashboard: { etiqueta: "Dashboard Analítico", href: "/dashboard" },
  auditoria: { etiqueta: "Auditoría", href: "/auditoria" },
  custom_claims: { etiqueta: "Usuarios", href: "/usuarios" },
};

/**
 * Construye el menú de navegación visible para `claims`, a partir de
 * `visibleNavSections` (dominio). El resultado preserva el orden emitido
 * por el dominio y omite cualquier `Resource` sin metadata de UI
 * definida en `METADATA_POR_RECURSO` (recursos sin sección propia de
 * navegación).
 */
export function construirMenuNavegacion(
  claims: CustomClaims
): readonly NavMenuItem[] {
  const secciones = visibleNavSections(claims);
  const items: NavMenuItem[] = [];

  // Secretario y Maestro solo ven Participantes y Registro Sabático
  const restriccionOperativa: ReadonlySet<Resource> | null =
    claims.role === "secretario" || claims.role === "maestro"
      ? new Set<Resource>(["participante", "registro_sabatico"])
      : null;

  for (const seccion of secciones) {
    if (restriccionOperativa && !restriccionOperativa.has(seccion.resource)) {
      continue;
    }
    const metadata = METADATA_POR_RECURSO[seccion.resource];
    if (metadata === undefined) {
      continue;
    }
    items.push({ resource: seccion.resource, ...metadata });
  }

  // "Usuarios" es visible para admin_global y admin_asociacion aunque
  // custom_claims no tenga operación "leer"/"listar" en PERMISSION_MATRIX
  if (claims.role === "admin_global" || claims.role === "admin_asociacion") {
    items.push({ resource: "custom_claims", etiqueta: "Usuarios", href: "/usuarios" });
  }

  return items;
}
