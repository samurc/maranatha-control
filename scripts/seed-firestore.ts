/**
 * Script de inicialización (seed) de la base de datos Firestore.
 *
 * Crea las colecciones definidas en design.md con datos de ejemplo para
 * desarrollo local. Ejecutar con:
 *
 *   npx tsx scripts/seed-firestore.ts
 *
 * Requiere las variables de entorno FIREBASE_ADMIN_* configuradas en
 * `.env.local`. El script carga `.env.local` automáticamente.
 *
 * IMPORTANTE: Este script es destructivo — sobrescribirá documentos con
 * los mismos IDs si ya existen.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cargar variables de entorno desde .env.local (sin depender de dotenv)
const envPath = resolve(import.meta.dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  let value = trimmed.slice(eqIndex + 1);
  // Remover comillas envolventes si las tiene
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// --- Inicializar Firebase Admin ---
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);
const auth = getAuth(app);

// --- IDs determinísticos para desarrollo ---
const ASOCIACION_ID = "asoc_central_sur";
const DISTRITO_ID = "dist_santiago_centro";
const IGLESIA_ID = "igl_maranatha_central";
const UNIDAD_1_ID = "unidad_adultos_1";
const UNIDAD_2_ID = "unidad_jovenes_1";
const PARTICIPANTE_1_ID = "part_juan_perez";
const PARTICIPANTE_2_ID = "part_maria_gomez";
const PARTICIPANTE_3_ID = "part_carlos_lopez";
const PARTICIPANTE_4_ID = "part_ana_martinez";
const PARTICIPANTE_5_ID = "part_pedro_visita";

async function seedAsociaciones() {
  console.log("📂 Creando asociaciones...");
  await db.collection("asociaciones").doc(ASOCIACION_ID).set({
    nombre: "Asociación Central Sur",
    paisCodigo: "CL",
    creadoEn: FieldValue.serverTimestamp(),
  });
  console.log("   ✓ Asociación Central Sur creada");
}

async function seedDistritos() {
  console.log("📂 Creando distritos...");
  await db.collection("distritos").doc(DISTRITO_ID).set({
    nombre: "Distrito Santiago Centro",
    asociacionId: ASOCIACION_ID,
    creadoEn: FieldValue.serverTimestamp(),
  });
  console.log("   ✓ Distrito Santiago Centro creado");
}

async function seedIglesias() {
  console.log("📂 Creando iglesias...");
  await db.collection("iglesias").doc(IGLESIA_ID).set({
    idOficial: IGLESIA_ID,
    nombre: "Iglesia Maranatha Central",
    asociacionId: ASOCIACION_ID,
    distritoId: DISTRITO_ID,
    paisCodigo: "CL",
    timezone: "America/Santiago",
    fechaAlta: FieldValue.serverTimestamp(),
    creadoEn: FieldValue.serverTimestamp(),
  });
  console.log("   ✓ Iglesia Maranatha Central creada");
}

async function seedUnidadesAccion() {
  console.log("📂 Creando unidades de acción...");

  await db.collection("unidades_accion").doc(UNIDAD_1_ID).set({
    iglesiaId: IGLESIA_ID,
    nombre: "Adultos - Grupo 1",
    maestroUid: "maestro_uid_placeholder",
    estado: "activa",
    creadoEn: FieldValue.serverTimestamp(),
  });
  console.log("   ✓ Unidad 'Adultos - Grupo 1' creada");

  await db.collection("unidades_accion").doc(UNIDAD_2_ID).set({
    iglesiaId: IGLESIA_ID,
    nombre: "Jóvenes - Grupo 1",
    maestroUid: "maestro_uid_placeholder",
    estado: "activa",
    creadoEn: FieldValue.serverTimestamp(),
  });
  console.log("   ✓ Unidad 'Jóvenes - Grupo 1' creada");
}

async function seedParticipantes() {
  console.log("📂 Creando participantes...");

  const participantes = [
    {
      id: PARTICIPANTE_1_ID,
      iglesiaId: IGLESIA_ID,
      unidadId: UNIDAD_1_ID,
      nombre: "Juan",
      apellido: "Pérez",
      esVisita: false,
      estado: "activo",
    },
    {
      id: PARTICIPANTE_2_ID,
      iglesiaId: IGLESIA_ID,
      unidadId: UNIDAD_1_ID,
      nombre: "María",
      apellido: "Gómez",
      esVisita: false,
      estado: "activo",
    },
    {
      id: PARTICIPANTE_3_ID,
      iglesiaId: IGLESIA_ID,
      unidadId: UNIDAD_1_ID,
      nombre: "Carlos",
      apellido: "López",
      esVisita: false,
      esMenorEdad: true,
      estado: "activo",
    },
    {
      id: PARTICIPANTE_4_ID,
      iglesiaId: IGLESIA_ID,
      unidadId: UNIDAD_2_ID,
      nombre: "Ana",
      apellido: "Martínez",
      esVisita: false,
      estado: "activo",
    },
    {
      id: PARTICIPANTE_5_ID,
      iglesiaId: IGLESIA_ID,
      unidadId: UNIDAD_2_ID,
      nombre: "Pedro",
      apellido: "Visitante",
      esVisita: true,
      estado: "activo",
    },
  ];

  for (const p of participantes) {
    const { id, ...data } = p;
    await db
      .collection("participantes")
      .doc(id)
      .set({
        ...data,
        creadoEn: FieldValue.serverTimestamp(),
      });
    console.log(`   ✓ Participante '${data.nombre} ${data.apellido}' creado`);
  }
}

async function seedRegistroSabatico() {
  console.log("📂 Creando registro sabático de ejemplo...");

  // Registro de ejemplo: T3 2026, Sábado 3
  const registroId = `${IGLESIA_ID}_${UNIDAD_1_ID}_2026_T3_S3`;

  await db.collection("registros_sabaticos").doc(registroId).set({
    iglesiaId: IGLESIA_ID,
    unidadId: UNIDAD_1_ID,
    sabadoEclesiastico: {
      anio: 2026,
      numeroTrimestre: 3,
      numeroSabado: 3,
      fechaISO: "2026-07-18",
      timezone: "America/Santiago",
    },
    estado: "borrador",
    asistencia: {
      [PARTICIPANTE_1_ID]: {
        presente: true,
        diasEstudio: 5,
        autorregistrado: false,
        codigoVisual: "P5",
        seguimientoPastoral: [],
      },
      [PARTICIPANTE_2_ID]: {
        presente: true,
        diasEstudio: 7,
        autorregistrado: false,
        codigoVisual: "P7",
        seguimientoPastoral: [],
      },
      [PARTICIPANTE_3_ID]: {
        presente: false,
        diasEstudio: 0,
        autorregistrado: false,
        codigoVisual: "A",
        seguimientoPastoral: [
          {
            accion: "llamado_telefonico",
            registradoPor: "maestro_uid_placeholder",
            registradoEn: new Date(),
          },
        ],
      },
    },
    totalesRapidos: {
      presentes: 2,
      ausentes: 1,
      visitas: 0,
    },
    creadoEn: FieldValue.serverTimestamp(),
    actualizadoEn: FieldValue.serverTimestamp(),
  });
  console.log(`   ✓ Registro sabático '${registroId}' creado`);
}

async function seedAuditoria() {
  console.log("📂 Creando eventos de auditoría de ejemplo...");

  await db.collection("auditoria").add({
    uid: "admin_uid_placeholder",
    accion: "crear_iglesia",
    recursoAfectado: `iglesias/${IGLESIA_ID}`,
    iglesiaId: IGLESIA_ID,
    timestamp: FieldValue.serverTimestamp(),
  });
  console.log("   ✓ Evento de auditoría creado");
}

async function seedEnlacesPendientes() {
  console.log("📂 Creando enlaces pendientes de ejemplo...");

  await db.collection("enlaces_pendientes").doc("ABC123").set({
    participanteId: PARTICIPANTE_4_ID,
    usado: false,
    emitidoPor: "secretario_uid_placeholder",
  });
  console.log("   ✓ Enlace pendiente 'ABC123' creado");
}

async function crearUsuarioAdmin() {
  console.log("👤 Verificando usuario admin...");

  const adminEmail = "admin@maranatha-control.com";
  const adminPassword = "Admin123!";

  try {
    const existingUser = await auth.getUserByEmail(adminEmail);
    console.log(`   ℹ Usuario admin ya existe: ${existingUser.uid}`);

    // Actualizar custom claims
    await auth.setCustomUserClaims(existingUser.uid, {
      role: "admin_global",
    });
    console.log("   ✓ Custom claims actualizados (admin_global)");
  } catch (error: unknown) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "auth/user-not-found"
    ) {
      const newUser = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: "Admin Global",
      });

      await auth.setCustomUserClaims(newUser.uid, {
        role: "admin_global",
      });

      console.log(`   ✓ Usuario admin creado: ${newUser.uid}`);
      console.log(`     Email: ${adminEmail}`);
      console.log(`     Password: ${adminPassword}`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log("🌱 Iniciando seed de Firestore para Maranatha Control...\n");

  try {
    await seedAsociaciones();
    await seedDistritos();
    await seedIglesias();
    await seedUnidadesAccion();
    await seedParticipantes();
    await seedRegistroSabatico();
    await seedAuditoria();
    await seedEnlacesPendientes();
    await crearUsuarioAdmin();

    console.log("\n✅ Seed completado exitosamente.");
    console.log("\n📋 Resumen de colecciones creadas:");
    console.log("   • asociaciones (1 documento)");
    console.log("   • distritos (1 documento)");
    console.log("   • iglesias (1 documento)");
    console.log("   • unidades_accion (2 documentos)");
    console.log("   • participantes (5 documentos)");
    console.log("   • registros_sabaticos (1 documento)");
    console.log("   • auditoria (1 documento)");
    console.log("   • enlaces_pendientes (1 documento)");
    console.log("\n👤 Usuario admin:");
    console.log("   Email: admin@maranatha-control.com");
    console.log("   Password: Admin123!");
    console.log("   Role: admin_global");
  } catch (error) {
    console.error("\n❌ Error durante el seed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
