"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { eliminarParticipanteCascada } from "../../../infrastructure/cascade-delete";

export async function crearParticipante(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const unidadId = formData.get("unidadId") as string;
  const iglesiaId = formData.get("iglesiaId") as string;
  const esVisita = formData.get("esVisita") === "true";

  if (!nombre || !apellido || !unidadId || !iglesiaId) return;

  const db = obtenerFirestoreAdmin();
  const id = `${iglesiaId}_${nombre.toLowerCase()}_${apellido.toLowerCase()}`.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  await db.collection("participantes").doc(id).set({
    nombre,
    apellido,
    unidadId,
    iglesiaId,
    esVisita,
    estado: "activo",
    creadoEn: new Date(),
  });

  revalidatePath("/participantes");
}

export async function eliminarParticipante(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const db = obtenerFirestoreAdmin();
  await eliminarParticipanteCascada(db, id);

  revalidatePath("/participantes");
}
