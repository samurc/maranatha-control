/**
 * Route Handler proxy para la API de SearchChurch.
 * Evita exponer la URL externa directamente al cliente (CORS).
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.query !== "string") {
    return Response.json({ error: "Query requerida" }, { status: 400 });
  }

  try {
    const resp = await fetch("https://iglesias.adventistas.org/v2/api/SearchChurch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: body.query, skip: body.skip ?? 0 }),
    });

    if (!resp.ok) {
      return Response.json({ error: "Error de la API externa" }, { status: 502 });
    }

    const data = await resp.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "No se pudo conectar con SearchChurch" }, { status: 502 });
  }
}
