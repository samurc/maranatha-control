"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImageCropperModal } from "./image-cropper-modal";

interface Participante {
  id: string;
  nombre: string;
  apellido: string;
  esVisita: boolean;
  estado?: string;
  fechaNacimiento?: string;
  celular?: string;
  correo?: string;
  distritoResidencia?: string;
  direccion?: string;
  comentario?: string;
  fotoUrl?: string;
}

interface EditarParticipanteFormProps {
  participante: Participante;
  action: (formData: FormData) => void;
}

function validarFechaDDMM(valor: string): boolean {
  if (!/^\d{2}-\d{2}$/.test(valor)) return false;
  const [dd, mm] = valor.split("-").map(Number);
  return dd! >= 1 && dd! <= 31 && mm! >= 1 && mm! <= 12;
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Guardando...
        </span>
      ) : (
        "Guardar cambios"
      )}
    </button>
  );
}

export function EditarParticipanteForm({ participante, action }: EditarParticipanteFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [nombre, setNombre] = useState(participante.nombre);
  const [apellido, setApellido] = useState(participante.apellido);
  const [fechaNacimiento, setFechaNacimiento] = useState(participante.fechaNacimiento ?? "");
  
  // Image Upload States
  const [fotoUrl, setFotoUrl] = useState(participante.fotoUrl ?? "");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const camposValidos =
    nombre.trim().length > 0 &&
    apellido.trim().length > 0 &&
    validarFechaDDMM(fechaNacimiento);

  async function handleAction(formData: FormData) {
    if (fotoUrl) {
      formData.set("fotoUrl", fotoUrl);
    }
    await action(formData);
    dialogRef.current?.close();
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImageToCrop(reader.result?.toString() || null);
        });
        reader.readAsDataURL(file);
      }
      e.target.value = ""; // reset input
    }
  };

  const handleCropDone = async (croppedBlob: Blob) => {
    setImageToCrop(null);
    setIsUploading(true);
    
    try {
      // Dynamic import to avoid loading Firebase on initial render if not needed
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { obtenerFirebaseStorageCliente } = await import("../../infrastructure/firebase-storage-client");
      
      const storage = obtenerFirebaseStorageCliente();
      const filename = `participantes/${participante.id}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, croppedBlob);
      const url = await getDownloadURL(storageRef);
      setFotoUrl(url);
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Hubo un error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        Editar
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-2xl shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Editar Participante</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-foreground/40 hover:text-foreground transition-colors text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <form action={handleAction} className="space-y-6">
            <input type="hidden" name="id" value={participante.id} />
            
            {/* Sección de Foto */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 p-4 border border-foreground/10 rounded-xl bg-foreground/[0.02]">
              <div className="relative">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-2 border-foreground/10" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-3xl font-bold border-2 border-blue-500/20">
                    {nombre.charAt(0).toUpperCase()}{apellido.charAt(0).toUpperCase()}
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Foto de perfil</h3>
                  <p className="text-xs text-foreground/50">Sube una foto clara (se recortará a formato cuadrado 300x300).</p>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1.5 text-xs font-medium bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-md transition-colors border border-foreground/10 disabled:opacity-50"
                  >
                    Cambiar foto
                  </button>
                  {fotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFotoUrl("")}
                      disabled={isUploading}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  name="nombre"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">
                  Apellido <span className="text-red-400">*</span>
                </label>
                <input
                  name="apellido"
                  required
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">
                  Fecha de nacimiento (DD-MM) <span className="text-red-400">*</span>
                </label>
                <input
                  name="fechaNacimiento"
                  required
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  placeholder="Ej: 25-12"
                  pattern="\d{2}-\d{2}"
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Tipo</label>
                <select name="esVisita" defaultValue={participante.esVisita ? "true" : "false"} className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                  <option value="false">Miembro</option>
                  <option value="true">Visita</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Celular</label>
                <input name="celular" defaultValue={participante.celular ?? ""} placeholder="Ej: +56912345678" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Correo electrónico</label>
                <input name="correo" type="email" defaultValue={participante.correo ?? ""} placeholder="Ej: participante@ejemplo.com" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Distrito (zona/barrio)</label>
                <input name="distritoResidencia" defaultValue={participante.distritoResidencia ?? ""} placeholder="Ej: Providencia" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Dirección domiciliaria</label>
                <input name="direccion" defaultValue={participante.direccion ?? ""} placeholder="Ej: Av. Principal 123" className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-foreground/80">Comentario</label>
                <input name="comentario" defaultValue={participante.comentario ?? ""} placeholder="Notas adicionales..." className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors" />
              </div>
              <div className="md:col-span-2 flex items-center gap-3 rounded-lg border border-foreground/10 px-3.5 py-3">
                <input
                  type="checkbox"
                  id="estado-activo"
                  name="estado"
                  value="activo"
                  defaultChecked={participante.estado !== "inactivo"}
                  className="h-4 w-4 rounded border-foreground/30 text-blue-600 focus:ring-blue-500/30"
                />
                <label htmlFor="estado-activo" className="text-sm text-foreground/80">
                  Participante activo
                </label>
              </div>
            </div>

            <SubmitBtn disabled={!camposValidos} />
          </form>
        </div>
        {imageToCrop && (
          <ImageCropperModal
            imageSrc={imageToCrop}
            onCropDone={handleCropDone}
            onCancel={() => setImageToCrop(null)}
          />
        )}
      </dialog>
    </>
  );
}
