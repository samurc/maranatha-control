import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const VARIABLES_SERVIDOR = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

async function setCors() {
  const valores: any = {};
  for (const nombre of VARIABLES_SERVIDOR) {
    if (!process.env[nombre]) throw new Error(`Falta ${nombre}`);
    valores[nombre] = process.env[nombre];
  }

  const credencial = {
    projectId: valores.FIREBASE_ADMIN_PROJECT_ID!.trim(),
    clientEmail: valores.FIREBASE_ADMIN_CLIENT_EMAIL!.trim(),
    privateKey: valores.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n").trim(),
  };

  if (getApps().length === 0) {
    initializeApp({ 
      credential: cert(credencial),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
  }

  const bucket = getStorage().bucket();

  console.log(`Configurando CORS para el bucket: ${bucket.name}...`);

  await bucket.setCorsConfiguration([
    {
      origin: ["*"],
      method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
      maxAgeSeconds: 3600,
      responseHeader: ["*"],
    },
  ]);

  console.log("CORS configurado con éxito.");
}

setCors().catch(console.error);
