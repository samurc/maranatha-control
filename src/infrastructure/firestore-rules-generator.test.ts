import { describe, expect, it } from "vitest";
import { generarFirestoreRules } from "./firestore-rules-generator";

describe("generarFirestoreRules (Requirement 19.4)", () => {
  it("genera un archivo de reglas bien formado a partir de PERMISSION_MATRIX", () => {
    const rules = generarFirestoreRules();

    expect(rules).toContain("rules_version = '2';");
    expect(rules).toContain("service cloud.firestore");
    expect(rules).toContain("match /iglesias/{docId}");
    expect(rules).toContain("match /registros_sabaticos/{docId}");
    expect(rules).toContain("match /auditoria/{docId}");
    // Recursos virtuales (dashboard, custom_claims, datos_personales) no
    // deben aparecer como colecciones de Firestore.
    expect(rules).not.toContain("__dashboard_virtual__");
    expect(rules).not.toContain("__custom_claims_virtual__");
  });

  it("restringe update/delete de auditoria a admin_global (Requirement 13.2)", () => {
    const rules = generarFirestoreRules();
    const bloqueAuditoria = rules.slice(
      rules.indexOf("match /auditoria/{docId}")
    );
    const lineaUpdate = bloqueAuditoria
      .split("\n")
      .find((linea) => linea.includes("allow update"));
    const lineaDelete = bloqueAuditoria
      .split("\n")
      .find((linea) => linea.includes("allow delete"));

    expect(lineaUpdate).toContain("admin_global");
    expect(lineaUpdate).not.toContain("secretario");
    expect(lineaDelete).toContain("admin_global");
  });

  it("permite crear/actualizar registros_sabaticos a secretario y maestro sobre su propia iglesia", () => {
    const rules = generarFirestoreRules();
    const bloque = rules.slice(
      rules.indexOf("match /registros_sabaticos/{docId}")
    );
    const lineaCreate = bloque.split("\n").find((l) => l.includes("allow create"));

    expect(lineaCreate).toContain("secretario");
    expect(lineaCreate).toContain("maestro");
    expect(lineaCreate).toContain("iglesiaId");
  });

  it("fusiona registro_sabatico y seguimiento_pastoral en un único bloque sin declaraciones duplicadas", () => {
    const rules = generarFirestoreRules();
    const inicio = rules.indexOf("match /registros_sabaticos/{docId}");
    const siguienteMatch = rules.indexOf("match /", inicio + 10);
    const bloque = rules.slice(inicio, siguienteMatch === -1 ? undefined : siguienteMatch);

    // Cada verbo de Firestore debe aparecer como máximo una vez dentro del
    // bloque (de lo contrario `firestore.rules` sería sintácticamente
    // inválido: dos "allow update" en el mismo match).
    for (const verbo of ["create", "update", "delete", "get", "list"]) {
      const ocurrencias = bloque.split(`allow ${verbo}:`).length - 1;
      expect(ocurrencias).toBe(1);
    }
  });
});
