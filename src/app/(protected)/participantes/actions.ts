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
  const fechaNacimiento = formData.get("fechaNacimiento") as string;
  const celular = formData.get("celular") as string;
  const correo = formData.get("correo") as string;
  const distritoResidencia = formData.get("distritoResidencia") as string;
  const direccion = formData.get("direccion") as string;
  const comentario = formData.get("comentario") as string;
  const fotoUrl = formData.get("fotoUrl") as string;

  if (!nombre || !apellido || !iglesiaId) return;

  const db = obtenerFirestoreAdmin();
  const id = `${iglesiaId}_${nombre.toLowerCase()}_${apellido.toLowerCase()}`.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  await db.collection("participantes").doc(id).set({
    nombre,
    apellido,
    ...(unidadId && { unidadId }),
    iglesiaId,
    esVisita,
    estado: "activo",
    ...(fechaNacimiento && { fechaNacimiento }),
    ...(celular && { celular }),
    ...(correo && { correo }),
    ...(distritoResidencia && { distritoResidencia }),
    ...(direccion && { direccion }),
    ...(comentario && { comentario }),
    ...(fotoUrl && { fotoUrl }),
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

export async function editarParticipante(formData: FormData) {
  const id = formData.get("id") as string;
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const esVisita = formData.get("esVisita") === "true";
  const estado = formData.get("estado") === "activo" ? "activo" : "inactivo";
  const fechaNacimiento = formData.get("fechaNacimiento") as string;
  const celular = formData.get("celular") as string;
  const correo = formData.get("correo") as string;
  const distritoResidencia = formData.get("distritoResidencia") as string;
  const direccion = formData.get("direccion") as string;
  const comentario = formData.get("comentario") as string;
  const fotoUrl = formData.get("fotoUrl") as string;

  if (!id || !nombre || !apellido) return;

  const db = obtenerFirestoreAdmin();
  await db.collection("participantes").doc(id).update({
    nombre,
    apellido,
    esVisita,
    estado,
    fechaNacimiento: fechaNacimiento || null,
    celular: celular || null,
    correo: correo || null,
    distritoResidencia: distritoResidencia || null,
    direccion: direccion || null,
    comentario: comentario || null,
    fotoUrl: fotoUrl || null,
    actualizadoEn: new Date(),
  });

  revalidatePath("/participantes");
}
