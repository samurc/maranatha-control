"use server";

import { revalidatePath } from "next/cache";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import {
  CANTIDAD_SABADOS,
  ETIQUETAS_CASILLERO,
  proximosSabados,
} from "./sabados";

/**
 * Server Actions del módulo "Encargados" (solo `secretario`).
 *
 * Cada Sábado disponible tiene 3 casilleros (slots 0, 1 y 2) donde se
 * puede asignar un Participante activo como encargado. La asignación se
 * persiste en la colección `encargados` con un ID determinístico
 * compuesto por el alcance territorial + fecha del sábado + número de
 * casillero, de modo que reasignar el mismo casillero sobrescribe la
 * asignación previa (idempotente).
 *
 * Nota de seguridad (ver guía de Server Actions de Next.js): una Server
 * Action es un endpoint POST alcanzable por cualquiera que pueda enviar
 * la misma petición, por lo que la autorización se revalida aquí dentro
 * y NUNCA se confía en el gating de render de la página.
 */

/** Alcance territorial del secretario para acotar las asignaciones. */
function alcanceDe(claims: { unidadId?: string; iglesiaId?: string }): {
  iglesiaId: string;
  unidadId: string;
} | null {
  if (!claims.iglesiaId) return null;
  // `unidadId` puede faltar; se usa cadena vacía en el ID compuesto para
  // asignaciones a nivel de iglesia sin unidad.
  return { iglesiaId: claims.iglesiaId, unidadId: claims.unidadId ?? "" };
}

function idAsignacion(iglesiaId: string, unidadId: string, fechaISO: string, slot: number): string {
  return `${iglesiaId}_${unidadId}_${fechaISO}_slot${slot}`;
}

const FECHA_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Asigna un Participante a un casillero (`slot`) de un sábado (`fechaISO`).
 * Sobrescribe cualquier asignación previa en ese casillero.
 */
export async function asignarEncargado(formData: FormData): Promise<void> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null || claims.role !== "secretario") {
    throw new Error("No autorizado");
  }
  const alcance = alcanceDe(claims);
  if (alcance === null) {
    throw new Error("El secretario no tiene una iglesia asignada");
  }

  const fechaISO = String(formData.get("fechaISO") ?? "");
  const slot = Number(formData.get("slot"));
  const participanteId = String(formData.get("participanteId") ?? "");

  if (!FECHA_ISO_RE.test(fechaISO)) throw new Error("Fecha inválida");
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) throw new Error("Casillero inválido");
  if (participanteId.length === 0) throw new Error("Participante inválido");

  const db = obtenerFirestoreAdmin();

  // Verificar que el participante pertenece al alcance del secretario y
  // está activo (nunca confiar en el ID enviado por el cliente).
  const participanteDoc = await db.collection("participantes").doc(participanteId).get();
  if (!participanteDoc.exists) throw new Error("Participante no encontrado");
  const p = participanteDoc.data()!;
  const perteneceAlAlcance = alcance.unidadId
    ? p.unidadId === alcance.unidadId
    : p.iglesiaId === alcance.iglesiaId;
  if (!perteneceAlAlcance || p.estado !== "activo") {
    throw new Error("El participante no está disponible para asignar");
  }

  const docId = idAsignacion(alcance.iglesiaId, alcance.unidadId, fechaISO, slot);
  await db.collection("encargados").doc(docId).set(
    {
      iglesiaId: alcance.iglesiaId,
      unidadId: alcance.unidadId,
      fechaISO,
      slot,
      participanteId,
      asignadoPor: claims.uid,
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/encargados");
}

/** Estados posibles de un sábado en el módulo Encargados. */
const ESTADOS_SABADO = ["por_confirmar", "confirmado"] as const;
type EstadoSabado = (typeof ESTADOS_SABADO)[number];

function idEstado(iglesiaId: string, unidadId: string, fechaISO: string): string {
  return `${iglesiaId}_${unidadId}_${fechaISO}_estado`;
}

/**
 * Establece el estado ("por_confirmar" | "confirmado") de un sábado
 * completo dentro del alcance del secretario.
 */
export async function establecerEstadoSabado(formData: FormData): Promise<void> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null || claims.role !== "secretario") {
    throw new Error("No autorizado");
  }
  const alcance = alcanceDe(claims);
  if (alcance === null) {
    throw new Error("El secretario no tiene una iglesia asignada");
  }

  const fechaISO = String(formData.get("fechaISO") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoSabado;

  if (!FECHA_ISO_RE.test(fechaISO)) throw new Error("Fecha inválida");
  if (!ESTADOS_SABADO.includes(estado)) throw new Error("Estado inválido");

  const db = obtenerFirestoreAdmin();
  const docId = idEstado(alcance.iglesiaId, alcance.unidadId, fechaISO);
  await db.collection("encargados").doc(docId).set(
    {
      iglesiaId: alcance.iglesiaId,
      unidadId: alcance.unidadId,
      fechaISO,
      tipo: "estado",
      estado,
      actualizadoPor: claims.uid,
      actualizadoEn: new Date(),
    },
    { merge: true }
  );

  revalidatePath("/encargados");
}

/**
 * Mueve o intercambia la asignación entre dos casilleros en una sola
 * operación atómica (batch), con una única revalidación.
 *
 * Se realiza server-side leyendo el estado autoritativo de Firestore: se
 * toma quién está en el casillero de origen y quién en el destino, y se
 * reescriben ambos (destino recibe el de origen; el origen recibe el del
 * destino si había alguien —swap— o se elimina —move—). Consolidar ambas
 * escrituras aquí evita la condición de carrera que existía al disparar
 * dos Server Actions separadas (cada una revalidando por su cuenta), que
 * podía dejar una de las dos escrituras sin guardar.
 */
export async function moverEncargado(formData: FormData): Promise<void> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null || claims.role !== "secretario") {
    throw new Error("No autorizado");
  }
  const alcance = alcanceDe(claims);
  if (alcance === null) {
    throw new Error("El secretario no tiene una iglesia asignada");
  }

  const fechaOrigen = String(formData.get("fechaOrigen") ?? "");
  const slotOrigen = Number(formData.get("slotOrigen"));
  const fechaDestino = String(formData.get("fechaDestino") ?? "");
  const slotDestino = Number(formData.get("slotDestino"));

  if (!FECHA_ISO_RE.test(fechaOrigen) || !FECHA_ISO_RE.test(fechaDestino)) {
    throw new Error("Fecha inválida");
  }
  if (!Number.isInteger(slotOrigen) || slotOrigen < 0 || slotOrigen > 2) {
    throw new Error("Casillero de origen inválido");
  }
  if (!Number.isInteger(slotDestino) || slotDestino < 0 || slotDestino > 2) {
    throw new Error("Casillero de destino inválido");
  }
  if (fechaOrigen === fechaDestino && slotOrigen === slotDestino) {
    return; // mismo casillero, nada que hacer.
  }

  const db = obtenerFirestoreAdmin();
  const refOrigen = db
    .collection("encargados")
    .doc(idAsignacion(alcance.iglesiaId, alcance.unidadId, fechaOrigen, slotOrigen));
  const refDestino = db
    .collection("encargados")
    .doc(idAsignacion(alcance.iglesiaId, alcance.unidadId, fechaDestino, slotDestino));

  const docs = await db.getAll(refOrigen, refDestino);
  const docOrigen = docs[0];
  const docDestino = docs[1];
  const idParticipanteOrigen =
    docOrigen && docOrigen.exists
      ? (docOrigen.data()?.participanteId as string | undefined)
      : undefined;
  if (!idParticipanteOrigen) {
    // El origen ya no tiene a nadie; no hay nada que mover.
    return;
  }
  const idParticipanteDestino =
    docDestino && docDestino.exists
      ? (docDestino.data()?.participanteId as string | undefined)
      : undefined;

  const base = {
    iglesiaId: alcance.iglesiaId,
    unidadId: alcance.unidadId,
    asignadoPor: claims.uid,
    actualizadoEn: new Date(),
  };

  const batch = db.batch();
  // Destino recibe al participante de origen.
  batch.set(
    refDestino,
    { ...base, fechaISO: fechaDestino, slot: slotDestino, participanteId: idParticipanteOrigen },
    { merge: true }
  );
  // Origen: swap si el destino tenía a alguien; si no, se elimina.
  if (idParticipanteDestino) {
    batch.set(
      refOrigen,
      { ...base, fechaISO: fechaOrigen, slot: slotOrigen, participanteId: idParticipanteDestino },
      { merge: true }
    );
  } else {
    batch.delete(refOrigen);
  }
  await batch.commit();

  revalidatePath("/encargados");
}

/** Quita la asignación de un casillero (`slot`) de un sábado (`fechaISO`). */
export async function quitarEncargado(formData: FormData): Promise<void> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null || claims.role !== "secretario") {
    throw new Error("No autorizado");
  }
  const alcance = alcanceDe(claims);
  if (alcance === null) {
    throw new Error("El secretario no tiene una iglesia asignada");
  }

  const fechaISO = String(formData.get("fechaISO") ?? "");
  const slot = Number(formData.get("slot"));

  if (!FECHA_ISO_RE.test(fechaISO)) throw new Error("Fecha inválida");
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) throw new Error("Casillero inválido");

  const db = obtenerFirestoreAdmin();
  const docId = idAsignacion(alcance.iglesiaId, alcance.unidadId, fechaISO, slot);
  await db.collection("encargados").doc(docId).delete();

  revalidatePath("/encargados");
}

/**
 * Genera el rol de Encargados como archivo `.xlsx` real (ExcelJS) y lo
 * devuelve codificado en base64 para su descarga en el cliente.
 *
 * Lee los datos autoritativos desde Firestore dentro del alcance del
 * secretario (no confía en datos enviados por el cliente): participantes
 * activos, asignaciones por casillero y estado de cada sábado.
 */
export async function exportarRolExcel(): Promise<string> {
  const claims = await obtenerClaimsDeSesion();
  if (claims === null || claims.role !== "secretario") {
    throw new Error("No autorizado");
  }
  const alcance = alcanceDe(claims);
  if (alcance === null) {
    throw new Error("El secretario no tiene una iglesia asignada");
  }

  const db = obtenerFirestoreAdmin();

  // Nombres de participantes activos dentro del alcance.
  const participantesQuery = claims.unidadId
    ? db
        .collection("participantes")
        .where("unidadId", "==", claims.unidadId)
        .where("estado", "==", "activo")
    : db
        .collection("participantes")
        .where("iglesiaId", "==", alcance.iglesiaId)
        .where("estado", "==", "activo");
  const participantesSnap = await participantesQuery.get();
  const nombrePorId = new Map<string, string>();
  for (const doc of participantesSnap.docs) {
    const d = doc.data();
    nombrePorId.set(doc.id, `${d.nombre ?? ""} ${d.apellido ?? ""}`.trim());
  }

  // Sábados visibles (misma ventana que la página).
  const sabados = proximosSabados(new Date(), CANTIDAD_SABADOS);
  const fechasVisibles = new Set(sabados.map((s) => s.fechaISO));

  // Asignaciones y estados existentes en el alcance.
  const encargadosQuery = claims.unidadId
    ? db
        .collection("encargados")
        .where("iglesiaId", "==", alcance.iglesiaId)
        .where("unidadId", "==", alcance.unidadId)
    : db.collection("encargados").where("iglesiaId", "==", alcance.iglesiaId);

  const asignaciones: Record<string, string> = {};
  const estados: Record<string, string> = {};
  const encargadosSnap = await encargadosQuery.get();
  for (const doc of encargadosSnap.docs) {
    const data = doc.data();
    const fechaISO = data.fechaISO as string | undefined;
    if (!fechaISO || !fechasVisibles.has(fechaISO)) continue;
    if (data.tipo === "estado") {
      if (typeof data.estado === "string") estados[fechaISO] = data.estado;
      continue;
    }
    const slot = data.slot as number | undefined;
    const participanteId = data.participanteId as string | undefined;
    if (typeof slot === "number" && participanteId) {
      asignaciones[`${fechaISO}_slot${slot}`] = participanteId;
    }
  }

  // Nombres de unidad e iglesia para el encabezado.
  let nombreUnidad = "";
  let nombreIglesia = "";
  if (claims.unidadId) {
    const unidadDoc = await db.collection("unidades_accion").doc(claims.unidadId).get();
    nombreUnidad = unidadDoc.exists ? ((unidadDoc.data()?.nombre as string) ?? "") : "";
  }
  const iglesiaDoc = await db.collection("iglesias").doc(alcance.iglesiaId).get();
  nombreIglesia = iglesiaDoc.exists ? ((iglesiaDoc.data()?.nombre as string) ?? "") : "";

  // Construcción del libro con ExcelJS.
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maranatha Control";
  workbook.created = new Date();
  const hoja = workbook.addWorksheet("Rol de Encargados");

  const columnas = ["Fecha", "Sábado", "Estado", ...ETIQUETAS_CASILLERO];
  hoja.columns = columnas.map((titulo, i) => ({
    header: titulo,
    key: `c${i}`,
    width: i < 2 ? 22 : i === 2 ? 16 : 26,
  }));

  // Título en una fila superior fusionada.
  const titulo = ["Rol de Encargados", nombreIglesia, nombreUnidad]
    .filter(Boolean)
    .join(" — ");
  hoja.spliceRows(1, 0, [titulo]);
  hoja.mergeCells(1, 1, 1, columnas.length);
  const celdaTitulo = hoja.getCell(1, 1);
  celdaTitulo.font = { bold: true, size: 14 };
  celdaTitulo.alignment = { vertical: "middle" };

  // Estilo del encabezado (fila 2 tras insertar el título).
  const filaEncabezado = hoja.getRow(2);
  filaEncabezado.font = { bold: true };
  filaEncabezado.eachCell((celda) => {
    celda.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    celda.border = { bottom: { style: "thin", color: { argb: "FFBFBFBF" } } };
  });

  const nombreEn = (fechaISO: string, slot: number): string =>
    nombrePorId.get(asignaciones[`${fechaISO}_slot${slot}`] ?? "") ?? "";

  for (const sabado of sabados) {
    const estado =
      (estados[sabado.fechaISO] ?? "por_confirmar") === "confirmado"
        ? "Confirmado"
        : "Por confirmar";
    hoja.addRow([
      sabado.fechaISO,
      sabado.etiqueta,
      estado,
      nombreEn(sabado.fechaISO, 0),
      nombreEn(sabado.fechaISO, 1),
      nombreEn(sabado.fechaISO, 2),
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}
