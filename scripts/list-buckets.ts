import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const VARIABLES_SERVIDOR = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

async function listBuckets() {
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
      credential: cert(credencial)
    });
  }

  const storage = getStorage();
  const [buckets] = await storage.storage.getBuckets();
  
  console.log("Buckets disponibles:");
  buckets.forEach(b => console.log(`- ${b.name}`));
}

listBuckets().catch(console.error);
