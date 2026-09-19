"use server";

import { revalidatePath } from "next/cache";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { obtenerClaimsDeSesion } from "../../../presentation/session";

/**
 * Persiste los grupos de Oración Intercesora de un sábado (registro). Los grupos
 * se guardan como arrays de ids de participante por género, en la colección
 * `oracion_intercesora` con ID = registroId.
 *
 * Seguridad: revalida la sesión y verifica que el registro pertenezca al ámbito
 * (unidad/iglesia) del usuario operativo.
 */
export async function guardarGruposOracion(formData: FormData): Promise<void> {
  const registroId = formData.get("registroId");
  const gruposJson = formData.get("grupos");

  if (typeof registroId !== "string" || registroId.length === 0) return;
  if (typeof gruposJson !== "string") return;

  let grupos: { hombres: string[][]; mujeres: string[][]; mixtos: string[][]; mixto: boolean };
  try {
    const parsed = JSON.parse(gruposJson) as {
      hombres?: unknown;
      mujeres?: unknown;
      mixtos?: unknown;
      mixto?: unknown;
    };
    const normalizar = (v: unknown): string[][] =>
      Array.isArray(v)
        ? v
          .filter((g): g is unknown[] => Array.isArray(g))
          .map((g) => g.filter((x): x is string => typeof x === "string"))
          .filter((g) => g.length > 0)
        : [];
    grupos = {
      hombres: normalizar(parsed.hombres),
      mujeres: normalizar(parsed.mujeres),
      mixtos: normalizar(parsed.mixtos),
      mixto: parsed.mixto === true,
    };
  } catch {
    return;
  }

  const claims = await obtenerClaimsDeSesion();
  if (claims === null) return;

  const db = obtenerFirestoreAdmin();
  const registroRef = db.collection("registros_sabaticos").doc(registroId);
  const registroSnap = await registroRef.get();
  if (!registroSnap.exists) return;

  const registro = registroSnap.data()!;
  const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
  if (esRolOperativo) {
    if (claims.unidadId && registro.unidadId !== claims.unidadId) return;
    if (!claims.unidadId && claims.iglesiaId && registro.iglesiaId !== claims.iglesiaId) return;
  }

  // Firestore NO permite arrays anidados (array de arrays). Se envuelve cada
  // grupo en un objeto `{ ids }` para persistir un array de objetos.
  await db.collection("oracion_intercesora").doc(registroId).set(
    {
      registroId,
      iglesiaId: registro.iglesiaId ?? null,
      unidadId: registro.unidadId ?? null,
      mixto: grupos.mixto,
      hombres: grupos.hombres.map((ids) => ({ ids })),
      mujeres: grupos.mujeres.map((ids) => ({ ids })),
      mixtos: grupos.mixtos.map((ids) => ({ ids })),
      actualizadoPor: claims.uid,
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/oracion-intercesora");
}
