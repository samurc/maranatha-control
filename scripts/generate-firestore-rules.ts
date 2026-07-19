/**
 * Script de generación de `firestore.rules` (Requerimiento 19.4, tarea
 * 30.1).
 *
 * Ejecuta `generarFirestoreRules()` (fuente de verdad: `PERMISSION_MATRIX`
 * en `src/domain/rbac/rbac-engine.ts`) y escribe el resultado en
 * `firestore.rules` en la raíz del proyecto. Debe ejecutarse cada vez que
 * `PERMISSION_MATRIX` cambia (ver `npm run generate:firestore-rules`), de
 * modo que el archivo de reglas de seguridad de Firestore nunca diverja
 * de la autorización de la capa de Aplicación (Property 46).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generarFirestoreRules } from "../src/infrastructure/firestore-rules-generator";

const destino = resolve(import.meta.dirname, "..", "firestore.rules");
writeFileSync(destino, generarFirestoreRules(), "utf-8");
console.log(`firestore.rules generado en ${destino}`);
