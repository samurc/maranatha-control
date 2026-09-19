"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { eliminarParticipanteCascada } from "../../../infrastructure/cascade-delete";

export async function crearParticipante(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const generoRaw = formData.get("genero") as string;
  const genero = generoRaw === "hombre" || generoRaw === "mujer" ? generoRaw : null;
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

  if (!nombre || !apellido || !iglesiaId || !genero) return;

  const db = obtenerFirestoreAdmin();
  const id = `${iglesiaId}_${nombre.toLowerCase()}_${apellido.toLowerCase()}`.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  await db.collection("participantes").doc(id).set({
    nombre,
    apellido,
    genero,
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
  const generoRaw = formData.get("genero") as string;
  const genero = generoRaw === "hombre" || generoRaw === "mujer" ? generoRaw : null;
  const esVisita = formData.get("esVisita") === "true";
  const estado = formData.get("estado") === "activo" ? "activo" : "inactivo";
  const fechaNacimiento = formData.get("fechaNacimiento") as string;
  const celular = formData.get("celular") as string;
  const correo = formData.get("correo") as string;
  const distritoResidencia = formData.get("distritoResidencia") as string;
  const direccion = formData.get("direccion") as string;
  const comentario = formData.get("comentario") as string;
  const fotoUrl = formData.get("fotoUrl") as string;
  const himnoFavorito = formData.get("himnoFavorito") as string;

  if (!id || !nombre || !apellido || !genero) return;

  const db = obtenerFirestoreAdmin();
  await db.collection("participantes").doc(id).update({
    nombre,
    apellido,
    genero,
    esVisita,
    estado,
    fechaNacimiento: fechaNacimiento || null,
    celular: celular || null,
    correo: correo || null,
    distritoResidencia: distritoResidencia || null,
    direccion: direccion || null,
    comentario: comentario || null,
    fotoUrl: fotoUrl || null,
    himnoFavorito: himnoFavorito?.trim() || null,
    actualizadoEn: new Date(),
  });

  revalidatePath("/participantes");
}

/**
 * Guarda el himno favorito (texto libre: número y nombre) de un Participante.
 *
 * Seguridad: revalida la sesión y, para roles operativos, verifica que el
 * participante pertenezca a su ámbito (unidad/iglesia). No confía en el cliente
 * más allá del ID; re-lee el participante desde Firestore.
 */
export async function guardarHimnoFavorito(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const himnoFavoritoRaw = formData.get("himnoFavorito");

  if (typeof id !== "string" || id.length === 0) return;
  const himnoFavorito =
    typeof himnoFavoritoRaw === "string" ? himnoFavoritoRaw.trim() : "";
  if (himnoFavorito.length === 0) return;

  const claims = await obtenerClaimsDeSesion();
  if (claims === null) return;

  const db = obtenerFirestoreAdmin();
  const ref = db.collection("participantes").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;

  const participante = snap.data()!;
  const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
  if (esRolOperativo) {
    if (claims.unidadId && participante.unidadId !== claims.unidadId) return;
    if (!claims.unidadId && claims.iglesiaId && participante.iglesiaId !== claims.iglesiaId) return;
  }

  await ref.update({ himnoFavorito, actualizadoEn: new Date() });

  revalidatePath("/participantes");
}
