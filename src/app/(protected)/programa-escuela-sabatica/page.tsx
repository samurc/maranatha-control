import { redirect } from "next/navigation";
import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { ProgramaClient } from "./programa-client";

/**
 * `/programa-escuela-sabatica` — Monitoreo del programa en tiempo real.
 *
 * Módulo SIN PERSISTENCIA: solo requiere sesión válida. Toda la lógica de
 * cronograma y countdowns vive en el cliente usando la hora local.
 */
export default async function ProgramaEscuelaSabaticaPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  return <ProgramaClient />;
}
