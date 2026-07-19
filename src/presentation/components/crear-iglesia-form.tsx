"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { SearchChurch } from "./search-church";

interface ChurchData {
  IdChurch: number;
  UniqueName: string;
  Name: string;
  Address: string;
  City: string;
  State: string;
  Latitude: number;
  Longitude: number;
  ThumbName: string;
  PastorName: string;
}

interface CrearIglesiaFormProps {
  asociaciones: { id: string; nombre: string }[];
  distritos: { id: string; nombre: string }[];
  action: (formData: FormData) => void;
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        "Crear Iglesia"
      )}
    </button>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground/50">{label}</p>
      <p className="rounded-md bg-foreground/5 px-3 py-2 text-sm text-foreground/80 border border-foreground/10">
        {value || "—"}
      </p>
    </div>
  );
}

export function CrearIglesiaForm({ asociaciones, distritos, action }: CrearIglesiaFormProps) {
  const [nombre, setNombre] = useState("");
  const [paisCodigo, setPaisCodigo] = useState("");
  const [churchData, setChurchData] = useState<ChurchData | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function handleSelect(church: ChurchData) {
    setNombre(church.Name);
    setChurchData(church);
  }

  async function handleAction(formData: FormData) {
    await action(formData);
    dialogRef.current?.close();
    setNombre("");
    setPaisCodigo("");
    setChurchData(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + Nueva
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 bg-background text-foreground rounded-xl border border-foreground/10 p-0 w-full max-w-4xl shadow-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      >
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Nueva Iglesia</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-foreground/40 hover:text-foreground transition-colors text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Buscador */}
          <div className="mb-5 rounded-lg border border-dashed border-foreground/20 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
              Buscar en registro oficial IASD
            </p>
            <SearchChurch onSelect={handleSelect} />
          </div>

          <form action={handleAction}>
            {/* Hidden fields con datos de SearchChurch */}
            {churchData && (
              <>
                <input type="hidden" name="idChurch" value={churchData.IdChurch} />
                <input type="hidden" name="uniqueName" value={churchData.UniqueName} />
                <input type="hidden" name="address" value={churchData.Address} />
                <input type="hidden" name="city" value={churchData.City} />
                <input type="hidden" name="state" value={churchData.State} />
                <input type="hidden" name="latitude" value={churchData.Latitude} />
                <input type="hidden" name="longitude" value={churchData.Longitude} />
                <input type="hidden" name="thumbName" value={churchData.ThumbName} />
                <input type="hidden" name="pastorName" value={churchData.PastorName} />
              </>
            )}

            {/* Dos columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna izquierda: campos editables */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider border-b border-foreground/10 pb-2">
                  Datos de registro
                </h3>

                <div className="space-y-1.5">
                  <label htmlFor="ig-nombre" className="block text-sm font-medium text-foreground/80">Nombre</label>
                  <input
                    id="ig-nombre"
                    name="nombre"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Iglesia Central"
                    className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="ig-pais" className="block text-sm font-medium text-foreground/80">País</label>
                    <select
                      id="ig-pais"
                      name="paisCodigo"
                      required
                      value={paisCodigo}
                      onChange={(e) => setPaisCodigo(e.target.value)}
                      className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="AR">Argentina</option>
                      <option value="BO">Bolivia</option>
                      <option value="BR">Brasil</option>
                      <option value="CL">Chile</option>
                      <option value="CO">Colombia</option>
                      <option value="CR">Costa Rica</option>
                      <option value="CU">Cuba</option>
                      <option value="DO">Rep. Dominicana</option>
                      <option value="EC">Ecuador</option>
                      <option value="SV">El Salvador</option>
                      <option value="GT">Guatemala</option>
                      <option value="HN">Honduras</option>
                      <option value="MX">México</option>
                      <option value="NI">Nicaragua</option>
                      <option value="PA">Panamá</option>
                      <option value="PY">Paraguay</option>
                      <option value="PE">Perú</option>
                      <option value="PR">Puerto Rico</option>
                      <option value="UY">Uruguay</option>
                      <option value="VE">Venezuela</option>
                      <option value="US">Estados Unidos</option>
                      <option value="ES">España</option>
                      <option value="PT">Portugal</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="ig-tz" className="block text-sm font-medium text-foreground/80">Zona horaria</label>
                    <select
                      id="ig-tz"
                      name="timezone"
                      className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="America/Argentina/Buenos_Aires">Argentina (Buenos Aires)</option>
                      <option value="America/La_Paz">Bolivia (La Paz)</option>
                      <option value="America/Sao_Paulo">Brasil (São Paulo)</option>
                      <option value="America/Manaus">Brasil (Manaus)</option>
                      <option value="America/Santiago">Chile (Santiago)</option>
                      <option value="America/Bogota">Colombia (Bogotá)</option>
                      <option value="America/Costa_Rica">Costa Rica</option>
                      <option value="America/Havana">Cuba (La Habana)</option>
                      <option value="America/Santo_Domingo">Rep. Dominicana</option>
                      <option value="America/Guayaquil">Ecuador (Guayaquil)</option>
                      <option value="America/El_Salvador">El Salvador</option>
                      <option value="America/Guatemala">Guatemala</option>
                      <option value="America/Tegucigalpa">Honduras</option>
                      <option value="America/Mexico_City">México (Ciudad de México)</option>
                      <option value="America/Tijuana">México (Tijuana)</option>
                      <option value="America/Managua">Nicaragua</option>
                      <option value="America/Panama">Panamá</option>
                      <option value="America/Asuncion">Paraguay (Asunción)</option>
                      <option value="America/Lima">Perú (Lima)</option>
                      <option value="America/Puerto_Rico">Puerto Rico</option>
                      <option value="America/Montevideo">Uruguay (Montevideo)</option>
                      <option value="America/Caracas">Venezuela (Caracas)</option>
                      <option value="America/New_York">EEUU (Eastern)</option>
                      <option value="America/Chicago">EEUU (Central)</option>
                      <option value="America/Denver">EEUU (Mountain)</option>
                      <option value="America/Los_Angeles">EEUU (Pacific)</option>
                      <option value="Europe/Madrid">España (Madrid)</option>
                      <option value="Europe/Lisbon">Portugal (Lisboa)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ig-asoc" className="block text-sm font-medium text-foreground/80">Asociación</label>
                  <select id="ig-asoc" name="asociacionId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                    <option value="">Seleccionar...</option>
                    {asociaciones.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ig-dist" className="block text-sm font-medium text-foreground/80">Distrito</label>
                  <select id="ig-dist" name="distritoId" required className="w-full rounded-lg border border-foreground/20 bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors">
                    <option value="">Seleccionar...</option>
                    {distritos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>

                <SubmitBtn />
              </div>

              {/* Columna derecha: datos de la API (readonly) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider border-b border-foreground/10 pb-2">
                  Datos oficiales (API)
                </h3>

                {!churchData ? (
                  <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-foreground/15 bg-foreground/[0.02]">
                    <p className="text-sm text-foreground/40 text-center px-4">
                      Busca y selecciona una iglesia para ver sus datos oficiales
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {churchData.ThumbName && (
                      <img
                        src={churchData.ThumbName}
                        alt={churchData.Name}
                        className="w-full h-28 object-cover rounded-lg border border-foreground/10"
                      />
                    )}
                    <ReadonlyField label="ID oficial" value={String(churchData.IdChurch)} />
                    <ReadonlyField label="Slug" value={churchData.UniqueName} />
                    <ReadonlyField label="Dirección" value={churchData.Address} />
                    <div className="grid grid-cols-2 gap-3">
                      <ReadonlyField label="Ciudad" value={churchData.City} />
                      <ReadonlyField label="Estado/Región" value={churchData.State} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ReadonlyField label="Latitud" value={String(churchData.Latitude)} />
                      <ReadonlyField label="Longitud" value={String(churchData.Longitude)} />
                    </div>
                    <ReadonlyField label="Pastor" value={churchData.PastorName} />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
