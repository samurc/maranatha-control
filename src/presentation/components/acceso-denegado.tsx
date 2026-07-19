/**
 * Vista de "Acceso denegado" (Requerimiento 15.2, tarea 34.3).
 *
 * Renderizada por `SectionGuard` cuando `canPerform` evalúa `false` para
 * el recurso de la sección solicitada. Componente de servidor puro (sin
 * `"use client"`): no depende de estado ni interactividad.
 */
export function AccesoDenegado(): React.JSX.Element {
  return (
    <main role="alert" aria-live="assertive">
      <h1>Acceso denegado</h1>
      <p>No tiene permiso para acceder a esta sección del Sistema.</p>
    </main>
  );
}
