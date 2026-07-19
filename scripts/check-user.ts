import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(import.meta.dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  let value = trimmed.slice(eqIndex + 1);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
});

const auth = getAuth(app);

async function main() {
  try {
    const user = await auth.getUserByEmail("admin@maranatha-control.com");
    console.log("Usuario encontrado:", user.uid);
    console.log("Email:", user.email);
    console.log("Custom Claims:", JSON.stringify(user.customClaims));
    console.log("Disabled:", user.disabled);
    console.log("Email Verified:", user.emailVerified);

    // Restablecer la contraseña para asegurarnos que funciona
    await auth.updateUser(user.uid, { password: "Admin123!" });
    console.log("\nContraseña restablecida a: Admin123!");
  } catch (e: unknown) {
    console.error("Error:", (e as Error).message);
  }
  process.exit(0);
}
main();
