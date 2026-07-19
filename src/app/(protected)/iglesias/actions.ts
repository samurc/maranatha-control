"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { eliminarIglesiaCascada } from "../../../infrastructure/cascade-delete";

export async function crearIglesia(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const paisCodigo = formData.get("paisCodigo") as string;
  const timezone = formData.get("timezone") as string;
  const distritoId = formData.get("distritoId") as string;
  const asociacionId = formData.get("asociacionId") as string;
  const idChurch = formData.get("idChurch") as string;
  const uniqueName = formData.get("uniqueName") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const latitude = formData.get("latitude") as string;
  const longitude = formData.get("longitude") as string;
  const thumbName = formData.get("thumbName") as string;
  const pastorName = formData.get("pastorName") as string;

  if (!nombre || !paisCodigo || !distritoId || !asociacionId) return;

  const db = obtenerFirestoreAdmin();
  const id = uniqueName || nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
  await db.collection("iglesias").doc(id).set({
    idOficial: id,
    nombre,
    paisCodigo: paisCodigo.toUpperCase(),
    timezone: timezone || undefined,
    distritoId,
    asociacionId,
    // Datos de SearchChurch
    ...(idChurch && { idChurch: Number(idChurch) }),
    ...(uniqueName && { uniqueName }),
    ...(address && { address }),
    ...(city && { city }),
    ...(state && { state }),
    ...(latitude && { latitude: Number(latitude) }),
    ...(longitude && { longitude: Number(longitude) }),
    ...(thumbName && { thumbName }),
    ...(pastorName && { pastorName }),
    fechaAlta: new Date(),
    creadoEn: new Date(),
  });

  revalidatePath("/iglesias");
}

export async function eliminarIglesia(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const db = obtenerFirestoreAdmin();
  await eliminarIglesiaCascada(db, id);

  revalidatePath("/iglesias");
  revalidatePath("/unidades");
  revalidatePath("/participantes");
  revalidatePath("/registros");
}
