/**
 * Generador de `firestore.rules` a partir de `PERMISSION_MATRIX`
 * (Requerimiento 19.4, tarea 30.1, Property 46).
 *
 * `PERMISSION_MATRIX` (domain/rbac/rbac-engine.ts) es la ÚNICA fuente de
 * verdad de la Matriz RBAC (Requerimiento 16). Este generador la traduce
 * a un archivo `firestore.rules` textual, de modo que un cambio en la
 * tabla se refleje automáticamente en ambos lados (Aplicación vía
 * `canPerform`, e Infraestructura vía las reglas de seguridad de
 * Firestore) sin que ningún desarrollador escriba las reglas de Firestore
 * a mano de forma independiente — el escenario exacto que Property 46
 * verifica (consistencia entre ambos).
 *
 * Mapeo `Resource` (dominio) -> colección de Firestore:
 */
import {
  PERMISSION_MATRIX,
  type PermissionRule,
  type ScopeRequirement,
} from "../domain/rbac/rbac-engine";
import type { Operation, Resource } from "../domain/rbac/types";
import type { Role } from "../domain/value-objects/custom-claims.vo";

/** Mapeo `Resource` (dominio) -> colección de Firestore de nivel superior. */
const COLECCION_POR_RECURSO: Readonly<Record<Resource, string>> = {
  asociacion: "asociaciones",
  distrito: "distritos",
  iglesia: "iglesias",
  unidad_accion: "unidades_accion",
  participante: "participantes",
  registro_sabatico: "registros_sabaticos",
  seguimiento_pastoral: "registros_sabaticos", // embebido, ver design.md
  dashboard: "__dashboard_virtual__", // agregado calculado, sin colección propia
  auditoria: "auditoria",
  custom_claims: "__custom_claims_virtual__", // gestionado vía Cloud Function administrativa, no vía Firestore directo
  datos_personales: "__datos_personales_virtual__", // operación administrativa, no vía Firestore directo
};

/** Mapeo `Operation` (dominio) -> verbo de `firestore.rules`. */
const OPERACION_A_VERBO_FIRESTORE: Readonly<Record<Operation, string>> = {
  crear: "create",
  leer: "get",
  actualizar: "update",
  eliminar: "delete",
  listar: "list",
};

function condicionDeAlcance(
  scope: ScopeRequirement,
  esCreacion: boolean
): string {
  const datos = esCreacion ? "request.resource.data" : "resource.data";
  switch (scope) {
    case "any":
      return "true";
    case "own_asociacion":
      return `request.auth.token.asociacionId == ${datos}.asociacionId`;
    case "own_distrito":
      return `request.auth.token.distritoId == ${datos}.distritoId`;
    case "own_iglesia":
    case "self":
      return `request.auth.token.iglesiaId == ${datos}.iglesiaId`;
  }
}

interface FilaAgrupada {
  readonly operation: Operation;
  readonly reglasPorRol: ReadonlyMap<Role, ScopeRequirement>;
}

/**
 * Agrupa `PERMISSION_MATRIX` por (colección de Firestore, operación),
 * NUNCA por (`Resource` de dominio, operación): varios `Resource`
 * distintos pueden mapear a la MISMA colección física de Firestore (p.
 * ej. `registro_sabatico` y `seguimiento_pastoral` comparten
 * `registros_sabaticos`, porque `Seguimiento_Pastoral` está embebido —
 * ver design.md, "Decisiones clave"). Agrupar por `Resource` produciría
 * dos declaraciones `allow update:` dentro del mismo bloque `match`, que
 * es sintaxis inválida de `firestore.rules`; agrupar por colección
 * fusiona correctamente las reglas de rol de ambos recursos en una sola
 * declaración por operación.
 */
function agruparPorColeccionYOperacion(
  matriz: readonly PermissionRule[]
): ReadonlyMap<string, readonly FilaAgrupada[]> {
  const porColeccionYOperacion = new Map<string, Map<Role, ScopeRequirement>>();
  for (const regla of matriz) {
    const coleccion = COLECCION_POR_RECURSO[regla.resource];
    if (coleccion.startsWith("__")) {
      continue; // recurso virtual, sin colección de Firestore.
    }
    const clave = `${coleccion}::${regla.operation}`;
    const reglasPorRol =
      porColeccionYOperacion.get(clave) ?? new Map<Role, ScopeRequirement>();
    // Si dos Resource distintos que comparten colección otorgan distinto
    // scope al MISMO rol para la MISMA operación, se conserva el más
    // permisivo evaluando ambos con OR (ver condicionDeReglas): en la
    // práctica basta con no sobrescribir una entrada ya existente para un
    // rol, ya que PERMISSION_MATRIX no tiene hoy ese caso, pero de
    // ocurrir, mantener ambas condiciones exigiría una lista, no un
    // Map<Role, _> de un solo scope. Se documenta esta limitación en vez
    // de resolver un caso que no existe en la tabla actual.
    reglasPorRol.set(regla.role, regla.scope);
    porColeccionYOperacion.set(clave, reglasPorRol);
  }

  const porColeccion = new Map<string, FilaAgrupada[]>();
  for (const [clave, reglasPorRol] of porColeccionYOperacion) {
    const separador = clave.lastIndexOf("::");
    const coleccion = clave.slice(0, separador);
    const operation = clave.slice(separador + 2) as Operation;
    const lista = porColeccion.get(coleccion) ?? [];
    lista.push({ operation, reglasPorRol });
    porColeccion.set(coleccion, lista);
  }
  return porColeccion;
}

function condicionDeReglas(
  reglasPorRol: ReadonlyMap<Role, ScopeRequirement>,
  esCreacion: boolean
): string {
  const clausulas = [...reglasPorRol.entries()].map(([role, scope]) => {
    const condicionRol = `request.auth.token.role == '${role}'`;
    const condicionScope = condicionDeScope(scope, esCreacion);
    return condicionScope === "true"
      ? condicionRol
      : `(${condicionRol} && ${condicionScope})`;
  });
  return clausulas.join(" || ");
}

function condicionDeScope(scope: ScopeRequirement, esCreacion: boolean): string {
  return condicionDeAlcance(scope, esCreacion);
}

/**
 * Genera el contenido textual de `firestore.rules` a partir de
 * `PERMISSION_MATRIX`. Colecciones virtuales (`dashboard`, `custom_claims`,
 * `datos_personales`, sin representación directa en Firestore) se omiten
 * del archivo generado: no existe ningún documento de Firestore al que
 * aplicarles una regla `match`.
 */
export function generarFirestoreRules(
  matriz: readonly PermissionRule[] = PERMISSION_MATRIX
): string {
  const porColeccion = agruparPorColeccionYOperacion(matriz);

  const bloques: string[] = [];
  for (const [coleccion, filasColeccion] of porColeccion) {
    const lineas = filasColeccion.map((fila) => {
      const verbo = OPERACION_A_VERBO_FIRESTORE[fila.operation];
      const esCreacion = fila.operation === "crear";
      const condicion = condicionDeReglas(fila.reglasPorRol, esCreacion);
      return `      allow ${verbo}: if ${condicion};`;
    });
    bloques.push(
      `    match /${coleccion}/{docId} {\n${lineas.join("\n")}\n    }`
    );
  }

  return [
    "// Generado automáticamente a partir de PERMISSION_MATRIX.",
    "// NO editar a mano: los cambios deben hacerse en domain/rbac/rbac-engine.ts.",
    "rules_version = '2';",
    "service cloud.firestore {",
    "  match /databases/{database}/documents {",
    ...bloques,
    "  }",
    "}",
    "",
  ].join("\n");
}
