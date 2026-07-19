import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { redirect } from "next/navigation";
import { listarUsuarios } from "./actions";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  // Solo admin_global y admin_asociacion pueden gestionar usuarios
  if (claims.role !== "admin_global" && claims.role !== "admin_asociacion") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground/50">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const usuarios = await listarUsuarios();

  // Obtener datos de referencia para los selectores
  const db = obtenerFirestoreAdmin();
  const [asociacionesSnap, distritosSnap, iglesiasSnap, unidadesSnap] = await Promise.all([
    db.collection("asociaciones").get(),
    db.collection("distritos").get(),
    db.collection("iglesias").get(),
    db.collection("unidades_accion").get(),
  ]);

  const asociaciones = asociacionesSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre as string }));
  const distritos = distritosSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre as string }));
  const iglesias = iglesiasSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre as string }));
  const unidades = unidadesSnap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre as string }));

  return (
    <UsuariosClient
      usuarios={usuarios}
      asociaciones={asociaciones}
      distritos={distritos}
      iglesias={iglesias}
      unidades={unidades}
    />
  );
}
