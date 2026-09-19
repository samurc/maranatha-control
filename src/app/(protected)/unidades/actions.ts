"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { eliminarUnidadCascada } from "../../../infrastructure/cascade-delete";

export async function crearUnidad(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const iglesiaId = formData.get("iglesiaId") as string;
  const maestroUid = formData.get("maestroUid") as string;

  if (!nombre || !iglesiaId) return;

  const db = obtenerFirestoreAdmin();
  const id = `${iglesiaId}_${nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}`;
  await db.collection("unidades_accion").doc(id).set({
    nombre,
    iglesiaId,
    maestroUid: maestroUid || "sin_asignar",
    estado: "activa",
    creadoEn: new Date(),
  });

  revalidatePath("/unidades");
}

export async function eliminarUnidad(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const db = obtenerFirestoreAdmin();
  await eliminarUnidadCascada(db, id);

  revalidatePath("/unidades");
  revalidatePath("/participantes");
  revalidatePath("/registros");
}

/**
 * Guarda (o reemplaza) la URL del QR de WhatsApp del grupo pequeño (unidad de
 * acción). La imagen ya fue subida a Storage por el cliente; aquí solo se
 * persiste la URL en los datos de la clase.
 *
 * Seguridad: revalida la sesión y, para roles operativos, verifica que la
 * unidad pertenezca a su ámbito (su propia unidad, o su iglesia).
 */
export async function guardarWhatsappQr(formData: FormData): Promise<void> {
  const unidadId = formData.get("unidadId");
  const urlRaw = formData.get("whatsappQrUrl");

  if (typeof unidadId !== "string" || unidadId.length === 0) return;
  const whatsappQrUrl = typeof urlRaw === "string" ? urlRaw.trim() : "";

  const claims = await obtenerClaimsDeSesion();
  if (claims === null) return;

  const db = obtenerFirestoreAdmin();
  const ref = db.collection("unidades_accion").doc(unidadId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const unidad = snap.data()!;
  const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
  if (esRolOperativo) {
    if (claims.unidadId && unidadId !== claims.unidadId) return;
    if (!claims.unidadId && claims.iglesiaId && unidad.iglesiaId !== claims.iglesiaId) return;
  }

  await ref.update({
    // Cadena vacía => quitar el QR.
    whatsappQrUrl: whatsappQrUrl.length > 0 ? whatsappQrUrl : null,
    actualizadoEn: new Date(),
  });

  revalidatePath("/participantes");
}
