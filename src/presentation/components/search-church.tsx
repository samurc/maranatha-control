"use client";

import { useState, useCallback } from "react";

interface Church {
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

interface SearchChurchProps {
  onSelect: (church: Church) => void;
}

export function SearchChurch({ onSelect }: SearchChurchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Church[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function handleSelect(church: Church) {
    onSelect(church);
    setResults([]);
    setSearched(false);
    setQuery("");
  }

  const buscar = useCallback(async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const resp = await fetch("/api/search-church", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), skip: 0 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResults(data.Data?.Churches ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscar(); } }}
          placeholder="Buscar iglesia oficial..."
          className="flex-1 rounded-lg border border-foreground/20 bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
        />
        <button
          type="button"
          onClick={buscar}
          disabled={loading || query.trim().length < 2}
          className="rounded-lg bg-foreground/10 px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            "Buscar"
          )}
        </button>
      </div>

      {searched && results.length === 0 && !loading && (
        <p className="text-xs text-foreground/50 text-center py-2">Sin resultados</p>
      )}

      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-foreground/10 divide-y divide-foreground/5">
          {results.map((church) => (
            <button
              key={church.IdChurch}
              type="button"
              onClick={() => handleSelect(church)}
              className="w-full text-left px-3 py-2 hover:bg-foreground/5 transition-colors"
            >
              <p className="text-sm font-medium text-foreground">{church.Name}</p>
              <p className="text-xs text-foreground/50">
                {church.City}, {church.State} — Pastor: {church.PastorName || "N/A"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
