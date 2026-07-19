import { describe, expect, it, vi } from "vitest";
import { SearchChurchHttpAdapter } from "./search-church-http.adapter";
import { SearchChurchTimeoutError } from "../../application/ports/search-church.port";

describe("SearchChurchHttpAdapter", () => {
  it("nunca incluye el token de sesión ni credenciales en la respuesta retornada al cliente (Property 11)", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        resultados: [{ idOficial: "IGL-1", nombre: "Iglesia Central", paisCodigo: "CL" }],
      }),
    });
    const adapter = new SearchChurchHttpAdapter({
      endpointUrl: "https://example.com/searchChurch",
      obtenerTokenSesion: async () => "token-secreto",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const resultados = await adapter.buscar("Central");

    expect(resultados).toEqual([
      { idOficial: "IGL-1", nombre: "Iglesia Central", paisCodigo: "CL" },
    ]);
    expect(JSON.stringify(resultados)).not.toContain("token-secreto");
  });

  it("propaga el criterio y el token de sesión en la solicitud a la Cloud Function", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resultados: [] }),
    });
    const adapter = new SearchChurchHttpAdapter({
      endpointUrl: "https://example.com/searchChurch",
      obtenerTokenSesion: async () => "token-abc",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await adapter.buscar("Adventista");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.com/searchChurch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-abc" }),
        body: JSON.stringify({ criterio: "Adventista" }),
      })
    );
  });

  it("lanza SearchChurchTimeoutError a los 10 segundos sin respuesta (Requirement 4.3)", async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = vi.fn().mockImplementation((_url, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      });
      const adapter = new SearchChurchHttpAdapter({
        endpointUrl: "https://example.com/searchChurch",
        obtenerTokenSesion: async () => "token-abc",
        fetchFn: fetchFn as unknown as typeof fetch,
      });

      const promesa = adapter.buscar("Central");
      const expectacion = expect(promesa).rejects.toBeInstanceOf(
        SearchChurchTimeoutError
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await expectacion;
    } finally {
      vi.useRealTimers();
    }
  });
});
