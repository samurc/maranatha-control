"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import type { CustomClaims } from "../../../domain/value-objects/custom-claims.vo";

/**
 * Resuelve y valida el registro objetivo para una operación sobre un ausente.
 *
 * Devuelve el ref, los datos del registro y la entrada de asistencia del
 * participante, o `null` si algo no valida (sesión ausente, registro
 * inexistente, fuera de ámbito, participante no ausente).
 *
 * Seguridad: revalida la sesión y verifica que el registro pertenezca al ámbito
 * (unidad/iglesia) del usuario operativo. No confía en datos del cliente más
 * allá de los IDs.
 */
async function resolverAusenteValidado(
  registroId: string,
  participanteId: string
): Promise<{
  claims: CustomClaims;
  esRolOperativo: boolean;
  registroRef: FirebaseFirestore.DocumentReference;
  registro: FirebaseFirestore.DocumentData;
} | null> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null) return null;

  const db = obtenerFirestoreAdmin();
  const registroRef = db.collection("registros_sabaticos").doc(registroId);
  const registroSnap = await registroRef.get();
  if (!registroSnap.exists) return null;

  const registro = registroSnap.data()!;

  // Verificación de ámbito: los roles operativos solo pueden tocar registros de
  // su propia unidad/iglesia. Otros roles (admin) no se restringen aquí.
  const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
  if (esRolOperativo) {
    if (claims.unidadId && registro.unidadId !== claims.unidadId) return null;
    if (!claims.unidadId && claims.iglesiaId && registro.iglesiaId !== claims.iglesiaId) return null;
  }

  // Solo se opera sobre alguien que exista en la asistencia y esté ausente.
  const asistencia = (registro.asistencia ?? {}) as Record<string, { presente?: boolean }>;
  const entrada = asistencia[participanteId];
  if (!entrada || entrada.presente === true) return null;

  return { claims, esRolOperativo, registroRef, registro };
}

/**
 * Asigna (o quita) un Participante activo como responsable de contactar a un
 * Participante que estuvo ausente en un Registro_Sabatico.
 *
 * El responsable se persiste embebido en `asistencia[participanteId].responsableId`
 * (nunca en una colección separada), consistente con el diseño de agregado único
 * del Registro_Sabatico. Asignar un responsable exonera la justificación previa
 * (`justificado` pasa a `false`).
 */
export async function asignarResponsableAusente(formData: FormData): Promise<void> {
  const registroId = formData.get("registroId");
  const participanteId = formData.get("participanteId");
  const responsableIdRaw = formData.get("responsableId");

  if (typeof registroId !== "string" || registroId.length === 0) return;
  if (typeof participanteId !== "string" || participanteId.length === 0) return;

  // Cadena vacía => quitar el responsable.
  const responsableId =
    typeof responsableIdRaw === "string" && responsableIdRaw.length > 0
      ? responsableIdRaw
      : null;

  const ctx = await resolverAusenteValidado(registroId, participanteId);
  if (ctx === null) return;
  const { esRolOperativo, claims, registroRef } = ctx;

  // Si se asigna un responsable, validar que sea un participante activo del ámbito.
  if (responsableId !== null) {
    const db = obtenerFirestoreAdmin();
    const responsableSnap = await db.collection("participantes").doc(responsableId).get();
    if (!responsableSnap.exists) return;
    const responsable = responsableSnap.data()!;
    if (responsable.estado !== "activo") return;
    if (esRolOperativo) {
      if (claims.unidadId && responsable.unidadId !== claims.unidadId) return;
      if (!claims.unidadId && claims.iglesiaId && responsable.iglesiaId !== claims.iglesiaId) return;
    }
  }

  // Merge-write profundo: preserva el resto de la entrada y de la asistencia.
  // Al asignar un responsable se limpia la justificación (evitamos escribir
  // `undefined`, que el SDK admin rechaza sin `ignoreUndefinedProperties`).
  const entradaPatch: Record<string, unknown> = { responsableId };
  if (responsableId !== null) entradaPatch.justificado = false;

  await registroRef.set(
    {
      asistencia: { [participanteId]: entradaPatch },
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/registros");
}

/**
 * Marca (o desmarca) una ausencia como justificada, exonerándola de la
 * asignación de un responsable. Al justificar se limpia `responsableId`.
 */
export async function justificarAusente(formData: FormData): Promise<void> {
  const registroId = formData.get("registroId");
  const participanteId = formData.get("participanteId");
  const justificadoRaw = formData.get("justificado");

  if (typeof registroId !== "string" || registroId.length === 0) return;
  if (typeof participanteId !== "string" || participanteId.length === 0) return;

  const justificado = justificadoRaw === "true";

  const ctx = await resolverAusenteValidado(registroId, participanteId);
  if (ctx === null) return;
  const { registroRef } = ctx;

  // Justificar exonera del responsable; desjustificar lo deja como esté.
  const entradaPatch: Record<string, unknown> = { justificado };
  if (justificado) entradaPatch.responsableId = null;

  await registroRef.set(
    {
      asistencia: { [participanteId]: entradaPatch },
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/registros");
}

/**
 * Marca el estado de contacto de un ausente: `true` = contactado,
 * `false` = sin contactar. Independiente de responsable/justificación.
 */
export async function marcarContactoAusente(formData: FormData): Promise<void> {
  const registroId = formData.get("registroId");
  const participanteId = formData.get("participanteId");
  const contactadoRaw = formData.get("contactado");

  if (typeof registroId !== "string" || registroId.length === 0) return;
  if (typeof participanteId !== "string" || participanteId.length === 0) return;

  const contactado = contactadoRaw === "true";

  const ctx = await resolverAusenteValidado(registroId, participanteId);
  if (ctx === null) return;
  const { registroRef } = ctx;

  await registroRef.set(
    {
      asistencia: { [participanteId]: { contactado } },
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/registros");
}

/**
 * Resuelve y valida el registro objetivo para una operación sobre un PRESENTE.
 * Análogo a `resolverAusenteValidado` pero exige `presente === true`.
 */
async function resolverPresenteValidado(
  registroId: string,
  participanteId: string
): Promise<{
  registroRef: FirebaseFirestore.DocumentReference;
  registro: FirebaseFirestore.DocumentData;
} | null> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null) return null;

  const db = obtenerFirestoreAdmin();
  const registroRef = db.collection("registros_sabaticos").doc(registroId);
  const registroSnap = await registroRef.get();
  if (!registroSnap.exists) return null;

  const registro = registroSnap.data()!;

  const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
  if (esRolOperativo) {
    if (claims.unidadId && registro.unidadId !== claims.unidadId) return null;
    if (!claims.unidadId && claims.iglesiaId && registro.iglesiaId !== claims.iglesiaId) return null;
  }

  const asistencia = (registro.asistencia ?? {}) as Record<string, { presente?: boolean }>;
  const entrada = asistencia[participanteId];
  if (!entrada || entrada.presente !== true) return null;

  return { registroRef, registro };
}

/**
 * Guarda la cantidad de visitas que un Participante presente trajo a la clase.
 * Se persiste embebido en `asistencia[participanteId].visitasTraidas`.
 */
export async function guardarVisitasTraidas(formData: FormData): Promise<void> {
  const registroId = formData.get("registroId");
  const participanteId = formData.get("participanteId");
  const visitasRaw = formData.get("visitasTraidas");

  if (typeof registroId !== "string" || registroId.length === 0) return;
  if (typeof participanteId !== "string" || participanteId.length === 0) return;

  // Normalizar a entero >= 0. Cadena vacía o inválida => 0.
  const parsed = typeof visitasRaw === "string" ? Number.parseInt(visitasRaw, 10) : NaN;
  const visitasTraidas = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;

  const ctx = await resolverPresenteValidado(registroId, participanteId);
  if (ctx === null) return;

  // Recalcular el total de visitas del registro sumando `visitasTraidas` de
  // todos los presentes, usando el valor recién editado para este participante.
  const asistencia = (ctx.registro.asistencia ?? {}) as Record<
    string,
    { presente?: boolean; visitasTraidas?: number }
  >;
  let totalVisitas = 0;
  for (const [pid, entrada] of Object.entries(asistencia)) {
    if (entrada?.presente !== true) continue;
    const v = pid === participanteId ? visitasTraidas : entrada.visitasTraidas;
    if (typeof v === "number" && v > 0) totalVisitas += Math.floor(v);
  }

  await ctx.registroRef.set(
    {
      asistencia: { [participanteId]: { visitasTraidas } },
      totalesRapidos: { visitas: totalVisitas },
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/registros");
}
