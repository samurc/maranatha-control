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

  if (!nombre || !paisCodigo || !distritoId || !asociacionId) return;

  const db = obtenerFirestoreAdmin();
  const id = nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  await db.collection("iglesias").doc(id).set({
    idOficial: id,
    nombre,
    paisCodigo: paisCodigo.toUpperCase(),
    timezone: timezone || undefined,
    distritoId,
    asociacionId,
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
