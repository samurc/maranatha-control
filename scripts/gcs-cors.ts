import { Storage } from "@google-cloud/storage";

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

  const storage = new Storage({
    projectId: valores.FIREBASE_ADMIN_PROJECT_ID!.trim(),
    credentials: {
      client_email: valores.FIREBASE_ADMIN_CLIENT_EMAIL!.trim(),
      private_key: valores.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n").trim(),
    },
  });

  const [buckets] = await storage.getBuckets();
  console.log("Buckets disponibles:");
  buckets.forEach((b) => console.log(`- ${b.name}`));

  let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
  // Check if exactly that bucket exists
  if (!buckets.find((b) => b.name === bucketName)) {
     // fallback
     bucketName = valores.FIREBASE_ADMIN_PROJECT_ID + ".appspot.com";
     if (buckets.find((b) => b.name === bucketName)) {
        console.log(`Fallback a bucket: ${bucketName}`);
     } else if (buckets.length > 0) {
        bucketName = buckets[0].name;
        console.log(`Usando el primer bucket encontrado: ${bucketName}`);
     } else {
        console.error("No se encontraron buckets en este proyecto.");
        return;
     }
  }

  const bucket = storage.bucket(bucketName);
  console.log(`Configurando CORS para el bucket: ${bucket.name}...`);

  await bucket.setCorsConfiguration([
    {
      origin: ["*"], // O puedes poner: ["http://localhost:3000", "https://maranatha-control.vercel.app"]
      method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
      maxAgeSeconds: 3600,
      responseHeader: ["*"],
    },
  ]);

  console.log("CORS configurado con éxito en", bucket.name);
}

setCors().catch(console.error);
