"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { eliminarDistritoCascada } from "../../../infrastructure/cascade-delete";

export async function crearDistrito(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const asociacionId = formData.get("asociacionId") as string;

  if (!nombre || !asociacionId) return;

  const db = obtenerFirestoreAdmin();
  const id = nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  await db.collection("distritos").doc(id).set({
    nombre,
    asociacionId,
    creadoEn: new Date(),
  });

  revalidatePath("/distritos");
}

export async function eliminarDistrito(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const db = obtenerFirestoreAdmin();
  await eliminarDistritoCascada(db, id);

  revalidatePath("/distritos");
  revalidatePath("/iglesias");
  revalidatePath("/unidades");
  revalidatePath("/participantes");
  revalidatePath("/registros");
}
