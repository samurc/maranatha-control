/**
 * Motor_RBAC (dominio puro, sin dependencias de Firebase/Next.js).
 *
 * Este módulo es la **única fuente de verdad** de la Matriz de Permisos del
 * Requerimiento 16. La tabla declarativa `PERMISSION_MATRIX` definida aquí
 * es consumida por:
 *  - `canPerform` (tarea 4.3, implementada sobre esta tabla).
 *  - El generador de `firestore.rules` (tarea 30.1), para que las reglas de
 *    seguridad de Firestore nunca diverjan de la autorización de Aplicación
 *    (Requerimiento 19.4, Property 46).
 *
 * Ver design.md, sección "Motor_RBAC (dominio puro...)".
 *
 * Validates: Requirements 12.1, 12.3, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6,
 * 16.7, 16.8
 */

import type { CustomClaims, Role } from "../value-objects/custom-claims.vo";
import type { Operation, Resource, ResourceScope } from "./types";

/* -------------------------------------------------------------------------
 * Tipos de la tabla declarativa
 * ---------------------------------------------------------------------- */

/**
 * Tipo de restricción territorial exigida por una regla de permiso.
 *
 * - `"any"`: sin restricción territorial (únicamente `admin_global`).
 * - `"own_asociacion"`: `scope.asociacionId` del recurso objetivo debe
 *   coincidir con `claims.asociacionId` del actor.
 * - `"own_distrito"`: `scope.distritoId` del recurso objetivo debe coincidir
 *   con `claims.distritoId` del actor. Usado por `pastor_distrital`/`anciano`
 *   para su lectura agregada (Requerimiento 16.8): NUNCA se otorga sobre
 *   recursos de datos individuales de Participante (`participante`,
 *   `registro_sabatico`, `seguimiento_pastoral`), solo sobre `iglesia`,
 *   `unidad_accion`, `distrito` y `dashboard`.
 * - `"own_iglesia"`: `scope.iglesiaId` del recurso objetivo debe coincidir
 *   con `claims.iglesiaId` del actor.
 * - `"self"`: además de la coincidencia territorial de `own_iglesia`,
 *   exige una verificación de **propiedad a nivel de registro** (por
 *   ejemplo, `participante.userUid === claims.uid`) que esta tabla y
 *   `canPerform` NO pueden resolver por sí solos, porque `ResourceScope`
 *   solo transporta identificadores territoriales (`iglesiaId`/
 *   `distritoId`/`asociacionId`), no el identificador del registro ni su
 *   dueño (Requerimientos 6.5, 6.6, 10.3). El caso de uso correspondiente
 *   DEBE aplicar esa verificación adicional como "regla de dominio" (el
 *   paso posterior a `canPerform` en el esqueleto canónico de design.md:
 *   validación Zod → `canPerform` → regla de dominio → `repo.save` →
 *   auditoría). `canPerform` (tarea 4.3) trata `"self"` como equivalente a
 *   `"own_iglesia"` para el filtro territorial grueso.
 */
export type ScopeRequirement =
  | "any"
  | "own_asociacion"
  | "own_distrito"
  | "own_iglesia"
  | "self";

/** Una regla individual de la Matriz de Permisos (Requerimiento 16). */
export interface PermissionRule {
  readonly role: Role;
  readonly resource: Resource;
  readonly operation: Operation;
  readonly scope: ScopeRequirement;
}

/* -------------------------------------------------------------------------
 * Construcción declarativa de PERMISSION_MATRIX
 * ---------------------------------------------------------------------- */

/**
 * Helper puramente sintáctico para declarar un bloque de reglas que
 * comparten `resource`/`operation`/`scope` para varios roles, evitando
 * repetición manual. No contiene lógica de negocio: solo expande el
 * producto cartesiano `roles × operations` en filas de `PermissionRule`.
 */
function rules(
  roles: readonly Role[],
  resource: Resource,
  operations: readonly Operation[],
  scope: ScopeRequirement
): PermissionRule[] {
  const rows: PermissionRule[] = [];
  for (const role of roles) {
    for (const operation of operations) {
      rows.push({ role, resource, operation, scope });
    }
  }
  return rows;
}

const READ = ["leer", "listar"] as const;

/**
 * Tabla declarativa: única fuente de verdad de la Matriz RBAC
 * (Requerimiento 16). Cada fila autoriza a un `role` a ejecutar una
 * `operation` sobre un `resource`, sujeto a la restricción territorial
 * `scope`. La ausencia de una fila para una combinación
 * (`role`, `resource`, `operation`) significa que esa combinación está
 * denegada para ese rol, sin excepción.
 *
 * Referencias normativas por bloque de recurso:
 */
export const PERMISSION_MATRIX: readonly PermissionRule[] = [
  /* ---------------------------------------------------------------------
   * asociacion (Requerimientos 2.1, 2.3, 16.1)
   *
   * Solo `admin_global` crea/elimina una Asociacion_Mision (Req 2.1, 2.3).
   * La fila de `admin_asociacion` para `crear` se incluye por simetría con
   * `distrito`/`iglesia` (Requerimiento 16.1 y Property 7 de design.md
   * enuncian la misma regla de alcance para "Asociacion_Mision, Distrito o
   * Iglesia"), pero es efectivamente inalcanzable en la práctica: una
   * Asociacion nueva no tiene un `asociacionId` propio que comparar contra
   * el token del actor (no es hijo de ninguna Asociación), por lo que la
   * comparación de alcance `own_asociacion` siempre resulta en `false` para
   * este recurso. Esto reconcilia la aparente contradicción entre el texto
   * literal del Requerimiento 2.3 ("únicamente admin_global") y el
   * Requerimiento 16.1/Property 7 (que menciona también a admin_asociacion):
   * la regla general de alcance ya produce el resultado correcto sin casos
   * especiales.
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "asociacion", ["crear", "actualizar", "eliminar"], "any"),
  ...rules(["admin_asociacion"], "asociacion", ["crear"], "own_asociacion"),
  ...rules(["admin_global"], "asociacion", READ, "any"),
  ...rules(["admin_asociacion"], "asociacion", READ, "own_asociacion"),

  /* ---------------------------------------------------------------------
   * distrito (Requerimientos 2.2, 2.3, 2.4, 2.5, 16.1)
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "distrito", ["crear", "actualizar", "eliminar"], "any"),
  ...rules(["admin_asociacion"], "distrito", ["crear"], "own_asociacion"),
  ...rules(["admin_global"], "distrito", READ, "any"),
  ...rules(["admin_asociacion"], "distrito", READ, "own_asociacion"),
  ...rules(["pastor_distrital", "anciano"], "distrito", READ, "own_distrito"),

  /* ---------------------------------------------------------------------
   * iglesia (Requerimientos 3.1-3.8, 12.1, 16.1)
   *
   * Lectura/listado: Property 1 de design.md ("Autorización territorial de
   * lectura y listado") exige que TODO rol autorizado territorialmente
   * (`isAuthorizedForChurch`) pueda leer/listar recursos con `iglesia_id`.
   * `iglesia` no es un dato individual de Participante, por lo que aquí NO
   * aplica la exclusión de `pastor_distrital`/`anciano` del Requerimiento
   * 16.8 (esa exclusión es específica de "datos individuales de
   * Participantes").
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "iglesia", ["crear", "actualizar", "eliminar"], "any"),
  ...rules(["admin_asociacion"], "iglesia", ["crear", "actualizar"], "own_asociacion"),
  ...rules(["admin_global"], "iglesia", READ, "any"),
  ...rules(["admin_asociacion"], "iglesia", READ, "own_asociacion"),
  ...rules(["pastor_distrital", "anciano"], "iglesia", READ, "own_distrito"),
  ...rules(["director_es", "secretario", "maestro", "alumno"], "iglesia", READ, "own_iglesia"),

  /* ---------------------------------------------------------------------
   * unidad_accion (Requerimientos 5.1-5.6, 12.4, 16.3)
   *
   * Escritura restringida a {admin_global, secretario, maestro} sobre su
   * propia `iglesia_id` (Req 16.3); Req 5.4 solo menciona a Secretario para
   * el cambio de `estado`, por lo que `actualizar`/`eliminar` se conceden a
   * `secretario` pero no a `maestro` (que solo crea, Req 5.1). Property 14
   * exige el rechazo explícito de `director_es`, `pastor_distrital`,
   * `anciano` y `alumno` para crear/editar/eliminar (Req 5.3): ninguno de
   * ellos aparece en las filas de escritura de este bloque.
   *
   * Lectura/listado: al no ser un dato individual de Participante,
   * Property 1 exige el otorgamiento universal (los 8 roles), cada uno con
   * su alcance territorial correspondiente (Req 5.5, 5.6).
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "unidad_accion", ["crear", "actualizar", "eliminar"], "any"),
  ...rules(["secretario"], "unidad_accion", ["crear", "actualizar", "eliminar"], "own_iglesia"),
  ...rules(["maestro"], "unidad_accion", ["crear"], "own_iglesia"),
  ...rules(["admin_global"], "unidad_accion", READ, "any"),
  ...rules(["admin_asociacion"], "unidad_accion", READ, "own_asociacion"),
  ...rules(["pastor_distrital", "anciano"], "unidad_accion", READ, "own_distrito"),
  ...rules(
    ["director_es", "secretario", "maestro", "alumno"],
    "unidad_accion",
    READ,
    "own_iglesia"
  ),

  /* ---------------------------------------------------------------------
   * participante (Requerimientos 6.1-6.7, 12.4, 16.3, 16.7, 16.8)
   *
   * Escritura restringida a {admin_global, secretario, maestro} sobre su
   * propia `iglesia_id` (Req 16.3), más `alumno` con alcance `"self"` para
   * editar únicamente su propio Participante vinculado (Req 6.5/6.6: el
   * caso de uso DEBE verificar además `participante.userUid === claims.uid`,
   * ver `ScopeRequirement.self`). `eliminar` no está descrito por ningún
   * Acceptance Criteria explícito (solo existe la transición a
   * `estado=inactivo` vía `actualizar`, Req 6.4); se concede únicamente a
   * `admin_global` como resguardo por defecto, igual que en `iglesia` y
   * `registro_sabatico`.
   *
   * Lectura/listado: recurso de datos individuales de Participante, por lo
   * que el Requerimiento 16.8 EXCLUYE explícitamente a `pastor_distrital`/
   * `anciano` ("sin acceso a datos individuales de Participantes"). El
   * Requerimiento 16.7 restringe a `director_es` a solo lectura (ya
   * reflejado por su ausencia en las filas de escritura). `alumno` solo
   * puede leer su propio Participante (`"self"`, Req 6.5/6.6).
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "participante", ["crear", "actualizar", "eliminar"], "any"),
  ...rules(["secretario", "maestro"], "participante", ["crear", "actualizar"], "own_iglesia"),
  ...rules(["alumno"], "participante", ["actualizar"], "self"),
  ...rules(["admin_global"], "participante", READ, "any"),
  ...rules(["admin_asociacion"], "participante", READ, "own_asociacion"),
  ...rules(["director_es", "secretario", "maestro"], "participante", READ, "own_iglesia"),
  ...rules(["alumno"], "participante", READ, "self"),

  /* ---------------------------------------------------------------------
   * registro_sabatico (Requerimientos 7.1-7.10, 8.1-8.4, 10.1-10.6, 12.4,
   * 16.4, 16.6, 16.7, 16.8)
   *
   * Escritura (crear/actualizar) restringida a {admin_global, secretario,
   * maestro} sobre su propia `iglesia_id` (Req 16.4), más `alumno` con
   * alcance `"self"` para el Autorregistro de Estudio Diario (Req 10.1-10.3,
   * 16.6): el caso de uso DEBE verificar además que el Participante
   * autorregistrado es el vinculado al `uid` del Alumno. La restricción
   * adicional de que Maestro NO puede cerrar/reabrir un Registro_Sabatico
   * (Req 8.2: esa transición de `estado` es exclusiva de Secretario/
   * Admin_Global) es una regla de dominio más fina que esta tabla NO
   * puede expresar (esta tabla no distingue "actualizar campos de
   * asistencia" de "actualizar estado a cerrado/borrador" como operaciones
   * separadas); se implementa como verificación adicional en
   * `cerrar-registro-sabatico.use-case.ts`/`reabrir-registro-sabatico.use-case.ts`
   * (tarea 18.1/18.2), siguiendo el mismo patrón canPerform → regla de
   * dominio del esqueleto canónico. `eliminar` está restringido
   * exclusivamente a `admin_global` (Req 7.9, 3.8).
   *
   * Lectura/listado: recurso de datos individuales de Participante, por lo
   * que (igual que `participante`) el Requerimiento 16.8 EXCLUYE a
   * `pastor_distrital`/`anciano` (ellos acceden a agregados vía el recurso
   * `dashboard`, no a `registro_sabatico` en bruto). `director_es` solo
   * lee (Req 16.7). `alumno` solo lee su propio estado y las metas
   * agregadas de su Unidad (Req 10.6, `"self"`; el caso de uso
   * `consultar-mi-progreso.use-case.ts` filtra el detalle agregado).
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "registro_sabatico", ["crear", "actualizar", "eliminar"], "any"),
  ...rules(["secretario", "maestro"], "registro_sabatico", ["crear", "actualizar"], "own_iglesia"),
  ...rules(["alumno"], "registro_sabatico", ["actualizar"], "self"),
  ...rules(["admin_global"], "registro_sabatico", READ, "any"),
  ...rules(["admin_asociacion"], "registro_sabatico", READ, "own_asociacion"),
  ...rules(["director_es", "secretario", "maestro"], "registro_sabatico", READ, "own_iglesia"),
  ...rules(["alumno"], "registro_sabatico", READ, "self"),

  /* ---------------------------------------------------------------------
   * seguimiento_pastoral (Requerimientos 9.1-9.5, 16.5, 16.8)
   *
   * Solo {admin_global, maestro} registran Seguimiento_Pastoral (Req 9.3,
   * 16.5); la restricción adicional de Req 9.1 ("Unidad_Accion a su cargo")
   * excede lo que `ResourceScope` puede expresar (no transporta
   * `maestro_uid` de la Unidad) y se verifica como regla de dominio
   * adicional en `registrar-seguimiento-pastoral.use-case.ts` (tarea 19.1).
   *
   * Lectura: dato individual de Participante ⇒ excluye a `pastor_distrital`/
   * `anciano` (Req 16.8). `alumno` no tiene ningún Acceptance Criteria que
   * le otorgue lectura directa de Seguimiento_Pastoral (su visibilidad se
   * limita a estudio/asistencia propios y metas agregadas, Req 10.6), por
   * lo que se omite intencionalmente.
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "seguimiento_pastoral", ["crear", "actualizar", "eliminar"], "any"),
  ...rules(["maestro"], "seguimiento_pastoral", ["crear", "actualizar"], "own_iglesia"),
  ...rules(["admin_global"], "seguimiento_pastoral", READ, "any"),
  ...rules(["admin_asociacion"], "seguimiento_pastoral", READ, "own_asociacion"),
  ...rules(["director_es", "secretario", "maestro"], "seguimiento_pastoral", READ, "own_iglesia"),

  /* ---------------------------------------------------------------------
   * dashboard (Requerimientos 11.1-11.5, 16.2, 16.8)
   *
   * Recurso de solo lectura (no existe operación de creación/edición/
   * eliminación sobre un agregado calculado). Autorizado a {admin_global,
   * admin_asociacion, pastor_distrital, anciano, director_es}, cada uno con
   * su alcance territorial (Req 16.2); explícitamente rechazado para
   * {secretario, maestro, alumno} (Req 11.5, Property 30): estos tres NO
   * tienen ninguna fila para el recurso `dashboard`.
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "dashboard", ["leer"], "any"),
  ...rules(["admin_asociacion"], "dashboard", ["leer"], "own_asociacion"),
  ...rules(["pastor_distrital", "anciano"], "dashboard", ["leer"], "own_distrito"),
  ...rules(["director_es"], "dashboard", ["leer"], "own_iglesia"),

  /* ---------------------------------------------------------------------
   * auditoria (Requerimientos 13.1-13.5)
   *
   * `crear` se omite deliberadamente: el registro de eventos de auditoría
   * es un efecto automático del wrapper transversal de casos de uso (tarea
   * 2.3/23.1, `registrarEventoAuditoria`), invocado directamente tras cada
   * mutación exitosa, y NO es una operación gateada por `canPerform` que un
   * actor solicite explícitamente. `actualizar`/`eliminar` se conceden
   * únicamente a `admin_global`, reflejando la única excepción a la
   * inmutabilidad del Requerimiento 13.2 ("sin permitir su edición o
   * eliminación por ningún rol distinto de Admin_Global"). La consulta
   * (`leer`/`listar`) se restringe a {admin_global, admin_asociacion} (Req
   * 13.3, 13.4); todos los demás roles son rechazados explícitamente (Req
   * 13.5, Property 36) por ausencia de fila.
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "auditoria", ["actualizar", "eliminar"], "any"),
  ...rules(["admin_global"], "auditoria", READ, "any"),
  ...rules(["admin_asociacion"], "auditoria", READ, "own_asociacion"),

  /* ---------------------------------------------------------------------
   * custom_claims (Requerimientos 1.1-1.4, 16.1)
   *
   * Solo {admin_global, admin_asociacion} asignan/actualizan Custom_Claims,
   * el segundo restringido a la `asociacion_id` OBJETIVO de los claims que
   * se están asignando (Req 1.1-1.3, Property 3). No se define `leer`,
   * `listar` ni `eliminar`: ningún Acceptance Criteria describe una
   * consulta o eliminación de Custom_Claims gateada por el Motor_RBAC, por
   * lo que se omiten en vez de inventar un permiso no especificado.
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "custom_claims", ["crear", "actualizar"], "any"),
  ...rules(["admin_asociacion"], "custom_claims", ["crear", "actualizar"], "own_asociacion"),

  /* ---------------------------------------------------------------------
   * datos_personales (Requerimientos 21.3, 21.4)
   *
   * Exportación (`leer`) y eliminación de datos personales restringidas
   * exclusivamente a `admin_global` (Property 52/53); ningún otro rol tiene
   * fila alguna para este recurso.
   * ------------------------------------------------------------------- */
  ...rules(["admin_global"], "datos_personales", ["leer", "eliminar"], "any"),
];

/* -------------------------------------------------------------------------
 * isAuthorizedForChurch / isAuthorizedForScope (Requerimiento 12)
 * ---------------------------------------------------------------------- */

/**
 * `isAuthorizedForChurch(claims, iglesiaId)`.
 *
 * Implementa **exactamente** la firma de `design.md`
 * (`function isAuthorizedForChurch(claims: CustomClaims, iglesiaId: string): boolean`).
 *
 * Decisión de diseño (resolución de una ambigüedad entre design.md y el
 * Requerimiento 12.1): el Requerimiento 12.1 exige que la función evalúe
 * verdadero también cuando el `distrito_id`/`asociacion_id` de los
 * Custom_Claims del actor "corresponde jerárquicamente" a la `iglesia_id`
 * del recurso. Sin embargo, esa correspondencia jerárquica solo puede
 * verificarse conociendo el `distrito_id`/`asociacion_id` PROPIO de la
 * Iglesia objetivo (es decir, de quién es padre esa Iglesia en el árbol
 * territorial) — dato que esta función pura de dominio no tiene manera de
 * resolver a partir de un simple `string` de `iglesiaId`, al no tener
 * acceso a ningún repositorio (el Dominio es Firebase-agnóstico y no debe
 * depender de Infraestructura, Requerimiento 19.1). El propio ejemplo de
 * reglas de Firestore en design.md confirma esta lectura: la versión de
 * `firestore.rules` de `isAuthorizedForChurch` ejecuta un `get()` adicional
 * sobre `/iglesias/{iglesiaId}` para leer `distrito_id`/`asociacion_id` DE
 * LA IGLESIA antes de compararlos con el token del actor — una operación de
 * lectura de infraestructura que no tiene equivalente en una función de
 * dominio puro sin parámetros adicionales.
 *
 * Por lo tanto:
 * - Esta función implementa fielmente la firma literal de design.md y
 *   cubre los dos casos que NO requieren conocer la jerarquía de la
 *   Iglesia objetivo: `role === "admin_global"` y coincidencia exacta de
 *   `iglesiaId`.
 * - La verificación jerárquica completa (Requerimiento 12.1, Property 1) se
 *   expone por separado como `isAuthorizedForScope(claims, scope)`, que
 *   recibe el `ResourceScope` ya resuelto del recurso objetivo (incluyendo
 *   su propio `distritoId`/`asociacionId`, resuelto por la capa de
 *   Aplicación a partir de los campos denormalizados del recurso — ver
 *   design.md, Modelo de datos de `Iglesia`: `asociacionId`, `distritoId` —
 *   sin necesidad de recorrer la jerarquía en cada consulta). `canPerform`
 *   (tarea 4.3) se construye sobre `isAuthorizedForScope`, no sobre esta
 *   función, precisamente porque necesita el alcance jerárquico completo.
 *
 * Validates: Requirements 12.1, 12.2
 */
export function isAuthorizedForChurch(
  claims: CustomClaims,
  iglesiaId: string
): boolean {
  return claims.role === "admin_global" || claims.iglesiaId === iglesiaId;
}

/**
 * `isAuthorizedForScope(claims, scope)`.
 *
 * Verificación jerárquica completa de autorización territorial
 * (Requerimiento 12.1, 12.2), usada por `canPerform` (tarea 4.3) y
 * equivalente en intención a la función homónima de `firestore.rules` en
 * design.md (que resuelve la jerarquía vía `get()` sobre el documento de la
 * Iglesia). Verdadero si y solo si:
 * - `claims.role === "admin_global"`, o
 * - `scope.iglesiaId` está definido y coincide con `claims.iglesiaId`, o
 * - `scope.distritoId` está definido y coincide con `claims.distritoId`, o
 * - `scope.asociacionId` está definido y coincide con `claims.asociacionId`.
 *
 * `scope` representa los identificadores territoriales del RECURSO
 * objetivo (no los del actor), ya resueltos por la capa de Aplicación
 * (por ejemplo, a partir de los campos denormalizados `asociacionId`/
 * `distritoId` del documento de Iglesia — ver design.md, Modelo de datos).
 *
 * Validates: Requirements 12.1, 12.2
 */
export function isAuthorizedForScope(
  claims: CustomClaims,
  scope: ResourceScope
): boolean {
  if (claims.role === "admin_global") {
    return true;
  }
  if (scope.iglesiaId !== undefined && scope.iglesiaId === claims.iglesiaId) {
    return true;
  }
  if (scope.distritoId !== undefined && scope.distritoId === claims.distritoId) {
    return true;
  }
  if (scope.asociacionId !== undefined && scope.asociacionId === claims.asociacionId) {
    return true;
  }
  return false;
}

/* -------------------------------------------------------------------------
 * hasOperationalRole (Requerimiento 12.3)
 * ---------------------------------------------------------------------- */

/**
 * Conjunto de roles operativos según el Requerimiento 12.3 (fuente
 * autoritativa de requirements.md): {secretario, maestro, director_es}.
 *
 * Nota de discrepancia documental: el comentario en línea de design.md
 * (`function hasOperationalRole(claims: CustomClaims): boolean; //
 * {secretario, maestro}`) omite `director_es`. El Requerimiento 12.3 de
 * requirements.md es explícito y más específico
 * ("... pertenece al conjunto {secretario, maestro, director_es}"), por lo
 * que se adopta este último como fuente de verdad, siguiendo la misma
 * convención aplicada en el resto de este módulo: ante una discrepancia
 * entre el resumen de design.md y el Acceptance Criteria correspondiente de
 * requirements.md, prevalece requirements.md.
 */
const OPERATIONAL_ROLES: ReadonlySet<Role> = new Set<Role>([
  "secretario",
  "maestro",
  "director_es",
]);

/**
 * `hasOperationalRole(claims)`.
 *
 * Verdadero si y solo si `claims.role` pertenece a {secretario, maestro,
 * director_es} (Requerimiento 12.3).
 *
 * Validates: Requirements 12.3
 */
export function hasOperationalRole(claims: CustomClaims): boolean {
  return OPERATIONAL_ROLES.has(claims.role);
}

/* -------------------------------------------------------------------------
 * canPerform (Requerimiento 12.4, 16.1-16.8)
 * ---------------------------------------------------------------------- */

/**
 * Evalúa si un `ScopeRequirement` individual (el de una fila concreta de
 * `PERMISSION_MATRIX` que ya coincidió en `role`/`resource`/`operation`) es
 * satisfecho por el `scope` del recurso objetivo y los Custom_Claims del
 * actor.
 *
 * A diferencia de `isAuthorizedForScope` (que evalúa con semántica OR si
 * CUALQUIERA de los tres niveles territoriales coincide, sin importar cuál
 * exige la regla), esta función comprueba el nivel territorial ESPECÍFICO
 * exigido por la regla que se está evaluando. Por eso no se reutiliza
 * `isAuthorizedForScope` directamente: una fila con `scope: "own_distrito"`
 * no debe autorizarse solo porque `scope.iglesiaId` del recurso coincida
 * con `claims.iglesiaId` del actor (eso sería otorgar un alcance más amplio
 * del que la fila realmente concede).
 *
 * `"any"` se resuelve como verdadero incondicional (independientemente de
 * a qué `role` esté asociada la fila en la tabla actual; ver comentario de
 * `ScopeRequirement` más arriba).
 *
 * `"self"` se trata como equivalente a `"own_iglesia"` para este filtro
 * territorial grueso, siguiendo la documentación de `ScopeRequirement` en
 * este mismo archivo. Las filas `"self"` (usadas por `alumno` sobre
 * `participante`/`registro_sabatico`) exigen ADEMÁS una verificación de
 * propiedad a nivel de registro (por ejemplo,
 * `participante.userUid === claims.uid`) que esta función pura NO puede
 * realizar, porque `ResourceScope` solo transporta identificadores
 * territoriales, no el identificador del registro ni su dueño. El caso de
 * uso invocante DEBE aplicar esa verificación adicional como "regla de
 * dominio" (Requerimientos 6.5, 6.6, 10.3).
 */
function satisfiesScopeRequirement(
  requirement: ScopeRequirement,
  claims: CustomClaims,
  scope: ResourceScope
): boolean {
  switch (requirement) {
    case "any":
      return true;
    case "own_asociacion":
      return (
        scope.asociacionId !== undefined &&
        scope.asociacionId === claims.asociacionId
      );
    case "own_distrito":
      return (
        scope.distritoId !== undefined && scope.distritoId === claims.distritoId
      );
    case "own_iglesia":
    case "self":
      return (
        scope.iglesiaId !== undefined && scope.iglesiaId === claims.iglesiaId
      );
  }
}

/**
 * `canPerform(claims, resource, operation, scope)`.
 *
 * Función central del Motor_RBAC (Requerimiento 12.4, 16.1-16.8), consumida
 * tanto por los casos de uso de Aplicación (paso "canPerform" del
 * esqueleto canónico, tarea 2.3) como por el generador de `firestore.rules`
 * (tarea 30.1), garantizando que ambas capas nunca diverjan (Property 46).
 *
 * Busca en `PERMISSION_MATRIX` toda fila cuyo `role` coincida con
 * `claims.role` y cuyo `resource`/`operation` coincidan con los argumentos.
 * Si no existe ninguna fila, deniega por ausencia (política por defecto de
 * `PERMISSION_MATRIX`, documentada más arriba en este archivo: la ausencia
 * de una fila para una combinación (`role`, `resource`, `operation`)
 * significa que esa combinación está denegada sin excepción).
 *
 * Si existe una o más filas coincidentes, `canPerform` retorna verdadero si
 * CUALQUIERA de ellas satisface su propio `ScopeRequirement` contra
 * `scope`/`claims` (ver `satisfiesScopeRequirement`). En la tabla actual
 * cada combinación (`role`, `resource`, `operation`) tiene como máximo una
 * fila, pero la función se implementa de forma general para tolerar futuras
 * filas adicionales sin cambiar su contrato.
 *
 * Nota sobre `"self"`: cuando la fila coincidente tiene `scope: "self"`
 * (alumno sobre `participante`/`registro_sabatico`), un resultado `true` de
 * esta función NO es suficiente para autorizar la operación: el caso de uso
 * invocante DEBE además verificar la propiedad del registro concreto (por
 * ejemplo, `participante.userUid === claims.uid`), ya que `canPerform` solo
 * puede evaluar el alcance territorial (`own_iglesia`), no la identidad del
 * registro (Requerimientos 6.5, 6.6, 10.3).
 *
 * Validates: Requirements 12.4, 15.4, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6,
 * 16.7, 16.8
 */
export function canPerform(
  claims: CustomClaims,
  resource: Resource,
  operation: Operation,
  scope: ResourceScope
): boolean {
  const matchingRules = PERMISSION_MATRIX.filter(
    (rule) =>
      rule.role === claims.role &&
      rule.resource === resource &&
      rule.operation === operation
  );

  if (matchingRules.length === 0) {
    return false;
  }

  return matchingRules.some((rule) =>
    satisfiesScopeRequirement(rule.scope, claims, scope)
  );
}

/* -------------------------------------------------------------------------
 * visibleNavSections (Requerimiento 15.4)
 * ---------------------------------------------------------------------- */

/**
 * Entrada del menú de navegación visible para un actor determinado.
 *
 * Se mantiene deliberadamente mínima: el mapeo de cada `Resource` a una
 * etiqueta/ruta concreta de UI no pertenece a la capa de Dominio y se
 * resuelve en la Presentación (tarea 34.4), que consume esta lista y decide
 * cómo representarla.
 */
export interface NavSection {
  readonly resource: Resource;
}

/** Operaciones que, de estar concedidas, hacen visible una sección de navegación. */
const NAV_VISIBILITY_OPERATIONS: readonly Operation[] = ["leer", "listar"];

/**
 * `visibleNavSections(claims)`.
 *
 * Construye el menú de navegación a partir de la misma `PERMISSION_MATRIX`
 * usada por el backend (Requerimiento 15.4), ocultando entradas sin
 * permiso. A diferencia de `canPerform`, esta función es deliberadamente
 * NO territorial: incluye un `Resource` en el resultado si existe alguna
 * fila en `PERMISSION_MATRIX` que otorgue a `claims.role` la operación
 * `"leer"` o `"listar"` sobre ese recurso, sin importar si el `scope`
 * territorial de esa fila coincidiría con los Custom_Claims del actor. La
 * visibilidad del menú es una decisión basada en el rol, no en el
 * territorio concreto: por ejemplo, un Secretario siempre ve la sección
 * "Unidades" en el menú, incluso antes de que la Presentación resuelva a
 * qué `iglesia_id` específica tiene acceso.
 *
 * El resultado no contiene duplicados: cada `Resource` visible aparece como
 * máximo una vez, en el orden de su primera aparición en
 * `PERMISSION_MATRIX`.
 *
 * Validates: Requirements 15.4
 */
export function visibleNavSections(claims: CustomClaims): NavSection[] {
  const seen = new Set<Resource>();
  const sections: NavSection[] = [];

  for (const rule of PERMISSION_MATRIX) {
    if (rule.role !== claims.role) {
      continue;
    }
    if (!NAV_VISIBILITY_OPERATIONS.includes(rule.operation)) {
      continue;
    }
    if (seen.has(rule.resource)) {
      continue;
    }
    seen.add(rule.resource);
    sections.push({ resource: rule.resource });
  }

  return sections;
}
