"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { eliminarAsociacionCascada } from "../../../infrastructure/cascade-delete";

export async function crearAsociacion(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const paisCodigo = formData.get("paisCodigo") as string;

  if (!nombre || !paisCodigo) return;

  const db = obtenerFirestoreAdmin();
  const id = nombre.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  await db.collection("asociaciones").doc(id).set({
    nombre,
    paisCodigo: paisCodigo.toUpperCase(),
    creadoEn: new Date(),
  });

  revalidatePath("/asociaciones");
}

export async function eliminarAsociacion(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const db = obtenerFirestoreAdmin();
  await eliminarAsociacionCascada(db, id);

  revalidatePath("/asociaciones");
  revalidatePath("/distritos");
  revalidatePath("/iglesias");
  revalidatePath("/unidades");
  revalidatePath("/participantes");
  revalidatePath("/registros");
}
