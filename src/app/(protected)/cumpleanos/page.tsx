import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { redirect } from "next/navigation";

function parseFechaNacimiento(fecha: string): { dia: number; mes: number } | null {
  if (!fecha || !/^\d{2}-\d{2}$/.test(fecha)) return null;
  const [dd, mm] = fecha.split("-").map(Number);
  if (dd! < 1 || dd! > 31 || mm! < 1 || mm! > 12) return null;
  return { dia: dd!, mes: mm! };
}

function diasHastaCumple(dia: number, mes: number, hoy: Date): number {
  const anio = hoy.getFullYear();
  let cumple = new Date(anio, mes - 1, dia);
  if (cumple < hoy) {
    cumple = new Date(anio + 1, mes - 1, dia);
  }
  const diff = cumple.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function CumpleanosPage(): Promise<React.JSX.Element> {
  const claims = await obtenerClaimsDeSesion();

  if (claims === null) {
    redirect("/login");
  }

  const esRolOperativo = claims.role === "secretario" || claims.role === "maestro";
  if (!esRolOperativo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground/50">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const db = obtenerFirestoreAdmin();

  // Obtener participantes de la unidad del usuario
  const query = claims.unidadId
    ? db.collection("participantes").where("unidadId", "==", claims.unidadId)
    : claims.iglesiaId
      ? db.collection("participantes").where("iglesiaId", "==", claims.iglesiaId)
      : null;

  if (!query) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground/50">No tienes una unidad o iglesia asignada.</p>
      </div>
    );
  }

  const snap = await query.get();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const participantes = snap.docs
    .map((d) => {
      const data = d.data();
      const parsed = parseFechaNacimiento(data.fechaNacimiento as string);
      if (!parsed) return null;
      const diasRestantes = diasHastaCumple(parsed.dia, parsed.mes, hoy);
      return {
        id: d.id,
        nombre: data.nombre as string,
        apellido: data.apellido as string,
        fechaNacimiento: data.fechaNacimiento as string,
        estado: (data.estado as string) ?? "activo",
        dia: parsed.dia,
        mes: parsed.mes,
        diasRestantes,
        comentario: (data.comentario as string) ?? "",
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  // Obtener nombre de la unidad
  let nombreUnidad = "";
  if (claims.unidadId) {
    const unidadDoc = await db.collection("unidades_accion").doc(claims.unidadId).get();
    nombreUnidad = unidadDoc.exists ? (unidadDoc.data()?.nombre as string) : "";
  }

  const cumpleHoy = participantes.filter((p) => p.diasRestantes === 0);
  const proximosSemana = participantes.filter((p) => p.diasRestantes > 0 && p.diasRestantes <= 7);
  const proximosMes = participantes.filter((p) => p.diasRestantes > 7 && p.diasRestantes <= 30);
  const restantes = participantes.filter((p) => p.diasRestantes > 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cumpleaños</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {nombreUnidad ? `Próximos cumpleaños — ${nombreUnidad}` : "Próximos cumpleaños de tu unidad"}
        </p>
      </div>

      {/* Cumple hoy */}
      {cumpleHoy.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">🎂 ¡Hoy cumplen años!</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cumpleHoy.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md bg-amber-500/10 px-3 py-2">
                <span className="text-lg">🎉</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{p.nombre} {p.apellido}</p>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${p.estado === "activo" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
                      {p.estado === "activo" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/50">{p.dia} de {MESES[p.mes]}</p>
                  {p.comentario && <p className="text-xs text-foreground/40 mt-0.5">{p.comentario}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Esta semana */}
      {proximosSemana.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Próximos 7 días</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {proximosSemana.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{p.nombre} {p.apellido}</p>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${p.estado === "activo" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
                      {p.estado === "activo" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/50">{p.dia} de {MESES[p.mes]}</p>
                  {p.comentario && <p className="text-xs text-foreground/40 mt-0.5">{p.comentario}</p>}
                </div>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                  {p.diasRestantes === 1 ? "Mañana" : `En ${p.diasRestantes} días`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Este mes */}
      {proximosMes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Próximos 30 días</h2>
          <div className="overflow-x-auto rounded-lg border border-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Nombre</th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Fecha</th>
                  <th className="px-4 py-2.5 text-right font-medium text-foreground/70">Faltan</th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Estado</th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Comentario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {proximosMes.map((p) => (
                  <tr key={p.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-2.5 text-foreground">{p.nombre} {p.apellido}</td>
                    <td className="px-4 py-2.5 text-foreground/60">{p.dia} de {MESES[p.mes]}</td>
                    <td className="px-4 py-2.5 text-right text-foreground/50">{p.diasRestantes} días</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.estado === "activo" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
                        {p.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground/50 text-xs">{p.comentario || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resto del año */}
      {restantes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Más adelante</h2>
          <div className="overflow-x-auto rounded-lg border border-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Nombre</th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Fecha</th>
                  <th className="px-4 py-2.5 text-right font-medium text-foreground/70">Faltan</th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Estado</th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground/70">Comentario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {restantes.map((p) => (
                  <tr key={p.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-2.5 text-foreground">{p.nombre} {p.apellido}</td>
                    <td className="px-4 py-2.5 text-foreground/60">{p.dia} de {MESES[p.mes]}</td>
                    <td className="px-4 py-2.5 text-right text-foreground/50">{p.diasRestantes} días</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.estado === "activo" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
                        {p.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground/50 text-xs">{p.comentario || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {participantes.length === 0 && (
        <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-foreground/15">
          <p className="text-foreground/40">No hay participantes con fecha de nacimiento registrada.</p>
        </div>
      )}
    </div>
  );
}
