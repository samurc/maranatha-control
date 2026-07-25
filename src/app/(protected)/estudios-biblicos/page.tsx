import { obtenerClaimsDeSesion } from "../../../presentation/session";
import { obtenerFirestoreAdmin } from "../../../infrastructure/firestore-admin";
import { redirect } from "next/navigation";
import { ModalForm, FormField } from "../../../presentation/components/modal-form";
import { crearInstructorBiblico, crearEstudianteBiblico } from "./actions";
import { EstudiosClient } from "./estudios-client";
import type {
  InstructorBiblico,
  EstudianteBiblico,
  AvanceEstudio,
  Participante,
} from "./estudios-client";

export default async function EstudiosBiblicosPage(): Promise<React.JSX.Element> {
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
  const iglesiaId = claims.iglesiaId ?? "";
  const unidadId = claims.unidadId ?? "";

  const ahora = new Date();
  const trimestre = Math.ceil((ahora.getMonth() + 1) / 3);
  const anio = ahora.getFullYear();

  // Cargar datos en paralelo
  const [instructoresSnap, estudiantesSnap, participantesSnap] = await Promise.all([
    iglesiaId
      ? db.collection("instructores_biblicos").where("iglesiaId", "==", iglesiaId).get()
      : db.collection("instructores_biblicos").limit(0).get(),
    iglesiaId
      ? db.collection("estudiantes_biblicos").where("iglesiaId", "==", iglesiaId).get()
      : db.collection("estudiantes_biblicos").limit(0).get(),
    unidadId
      ? db.collection("participantes").where("unidadId", "==", unidadId).where("estado", "==", "activo").get()
      : iglesiaId
        ? db.collection("participantes").where("iglesiaId", "==", iglesiaId).where("estado", "==", "activo").get()
        : db.collection("participantes").limit(0).get(),
  ]);

  const instructores: InstructorBiblico[] = instructoresSnap.docs.map((d) => ({
    id: d.id,
    nombre: d.data().nombre as string,
    miembros: (d.data().miembros as string[]) ?? [],
  }));

  const estudiantes: EstudianteBiblico[] = estudiantesSnap.docs.map((d) => ({
    id: d.id,
    nombre: d.data().nombre as string,
    apellido: d.data().apellido as string,
    estadoCivil: (d.data().estadoCivil as string) ?? null,
    grupoEtareo: (d.data().grupoEtareo as string) ?? null,
    cursoBiblico: (d.data().cursoBiblico as string) ?? null,
    instructorId: (d.data().instructorId as string) ?? null,
    candidatoBautismo: (d.data().candidatoBautismo as boolean) ?? false,
  }));

  const participantes: Participante[] = participantesSnap.docs.map((d) => ({
    id: d.id,
    nombre: d.data().nombre as string,
    apellido: d.data().apellido as string,
  }));

  // Cargar avances del trimestre actual para todos los estudiantes
  let avances: AvanceEstudio[] = [];
  if (estudiantes.length > 0) {
    const estudianteIds = estudiantes.map((e) => e.id);
    // Firestore limita "in" a 30 elementos; chunkeamos si hay más
    const chunks: string[][] = [];
    for (let i = 0; i < estudianteIds.length; i += 30) {
      chunks.push(estudianteIds.slice(i, i + 30));
    }

    const avancesSnaps = await Promise.all(
      chunks.map((chunk) =>
        db.collection("avances_estudio_biblico")
          .where("estudianteId", "in", chunk)
          .where("anio", "==", anio)
          .where("trimestre", "==", trimestre)
          .get()
      )
    );

    for (const snap of avancesSnaps) {
      for (const doc of snap.docs) {
        const data = doc.data();
        const lecciones: Record<string, boolean> = {};
        for (let i = 1; i <= 20; i++) {
          lecciones[`leccion_${i}`] = (data[`leccion_${i}`] as boolean) ?? false;
        }
        avances.push({ estudianteId: data.estudianteId as string, lecciones });
      }
    }
  }

  // Nombre de iglesia y unidad para el subtitle
  let nombreUnidad = "";
  let nombreIglesia = "";
  if (unidadId) {
    const doc = await db.collection("unidades_accion").doc(unidadId).get();
    nombreUnidad = doc.exists ? (doc.data()?.nombre as string) : "";
  }
  if (iglesiaId) {
    const doc = await db.collection("iglesias").doc(iglesiaId).get();
    nombreIglesia = doc.exists ? (doc.data()?.nombre as string) : "";
  }

  // Acción de crear instructor con iglesiaId/unidadId inyectados
  async function crearInstructorConContexto(formData: FormData) {
    "use server";
    formData.set("iglesiaId", iglesiaId);
    formData.set("unidadId", unidadId);
    await crearInstructorBiblico(formData);
  }

  async function crearEstudianteConContexto(formData: FormData) {
    "use server";
    formData.set("iglesiaId", iglesiaId);
    formData.set("unidadId", unidadId);
    await crearEstudianteBiblico(formData);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control y Monitoreo de Estudios Bíblicos</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {nombreIglesia && nombreUnidad
              ? `${nombreIglesia} — ${nombreUnidad} — ${trimestre}° Trimestre ${anio}`
              : `${trimestre}° Trimestre ${anio}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón nuevo instructor */}
          <ModalForm
            id="crear-instructor"
            title="Nuevo Instructor Bíblico"
            action={crearInstructorConContexto}
          trigger={
              <button className="rounded-lg border border-foreground/20 px-3 py-2 text-xs font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
                + Instructor
              </button>
            }
          >
            <FormField label="Nombre del equipo / instructor" name="nombre" required placeholder="Ej: Equipo 1 — Juan Pérez" />
          </ModalForm>

          {/* Botón nuevo estudiante */}
          <ModalForm
            id="crear-estudiante"
            title="Nuevo Estudiante de la Biblia"
            action={crearEstudianteConContexto}
            trigger={
              <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                + Estudiante
              </button>
            }
          >
            <FormField label="Nombre" name="nombre" required placeholder="Nombres" />
            <FormField label="Apellido" name="apellido" required placeholder="Apellidos" />

            <div className="space-y-1.5">
              <label htmlFor="estadoCivil" className="block text-sm font-medium text-foreground/80">Estado Civil</label>
              <select id="estadoCivil" name="estadoCivil" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="">Seleccionar...</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="viudo">Viudo/a</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="grupoEtareo" className="block text-sm font-medium text-foreground/80">Grupo Etáreo</label>
              <select id="grupoEtareo" name="grupoEtareo" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="">Seleccionar...</option>
                <option value="nino">Niño</option>
                <option value="adolescente">Adolescente</option>
                <option value="joven">Joven</option>
                <option value="adulto">Adulto</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cursoBiblico" className="block text-sm font-medium text-foreground/80">Curso Bíblico</label>
              <select id="cursoBiblico" name="cursoBiblico" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="">Seleccionar...</option>
                <option value="fe-de-jesus">La fe de Jesús</option>
                <option value="yo-creo">Yo Creo</option>
                <option value="descubra">Descubra</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="instructorId" className="block text-sm font-medium text-foreground/80">Instructor (opcional)</label>
              <select id="instructorId" name="instructorId" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                <option value="">Sin asignar</option>
                {instructores.map((i) => (
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
              </select>
            </div>
          </ModalForm>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Instructores</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{instructores.length}</p>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Estudiantes</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{estudiantes.length}</p>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Candidatos bautismo</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {estudiantes.filter((e) => e.candidatoBautismo).length}
          </p>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">Trimestre</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{trimestre}° / {anio}</p>
        </div>
      </div>

      {/* Contenido interactivo */}
      <EstudiosClient
        instructores={instructores}
        estudiantes={estudiantes}
        avances={avances}
        participantes={participantes}
      />
    </div>
  );
}
