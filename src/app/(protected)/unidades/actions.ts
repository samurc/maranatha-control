"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
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
