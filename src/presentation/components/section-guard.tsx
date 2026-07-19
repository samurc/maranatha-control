/**
 * `SectionGuard` (Requerimiento 15.2, tarea 34.3).
 *
 * Guarda de layout por sección: invoca `canPerform(claims, resource,
 * "leer", scope)` sobre el recurso de la ruta; si es falso, renderiza
 * `<AccesoDenegado />` en vez de `children` (Requirement 15.2). Componente
 * de servidor: lee la sesión vía `obtenerClaimsDeSesion()` (Data Access
 * Layer, `session.ts`) en cada render, sin depender de que `proxy.ts` ya
 * haya verificado la sesión (Proxy no es la única línea de defensa).
 *
 * Si no hay sesión en absoluto, redirige a `/login` (Requirement 15.1) en
 * vez de mostrar "Acceso denegado" — ausencia de sesión y falta de
 * permiso son dos condiciones distintas del Requerimiento 15 (15.1 vs.
 * 15.2) y este componente distingue explícitamente entre ambas.
 */
import { redirect } from "next/navigation";
import { canPerform } from "../../domain/rbac/rbac-engine";
import type { Resource, ResourceScope } from "../../domain/rbac/types";
import { obtenerClaimsDeSesion } from "../session";
import { AccesoDenegado } from "./acceso-denegado";

export interface SectionGuardProps {
  readonly resource: Resource;
  /** Alcance territorial del recurso de la sección; por defecto, el propio alcance del actor (secciones sin un recurso concreto aún seleccionado, p. ej. un listado). */
  readonly scope?: ResourceScope;
  readonly children: React.ReactNode;
}

export async function SectionGuard({
  resource,
  scope,
  children,
}: SectionGuardProps): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  const scopeEfectivo: ResourceScope = scope ?? {
    iglesiaId: claims.iglesiaId,
    distritoId: claims.distritoId,
    asociacionId: claims.asociacionId,
  };

  if (!canPerform(claims, resource, "leer", scopeEfectivo)) {
    return <AccesoDenegado />;
  }

  return <>{children}</>;
}
