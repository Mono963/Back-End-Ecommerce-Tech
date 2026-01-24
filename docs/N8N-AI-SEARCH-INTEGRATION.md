# Búsqueda Híbrida - Guía para Frontend

## Resumen

El backend ofrece **dos formas** de consumir la búsqueda híbrida:

| Método | Endpoint | Velocidad Percibida | Uso Recomendado |
|--------|----------|---------------------|-----------------|
| **SSE** | `/products/search/hybrid` | Ultra rápida | Barra de búsqueda principal |
| **REST** | `/products/search` | Normal | Búsquedas programáticas, fallback |

---

## Recomendación

```
┌─────────────────────────────────────────────────────────────┐
│                    ¿CUÁL USAR?                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 BARRA DE BÚSQUEDA (usuario escribe)                     │
│     └──→ SSE (/products/search/hybrid)                      │
│          • Resultados instantáneos mientras escribe         │
│          • IA llega después sin bloquear                    │
│                                                             │
│  🔧 BÚSQUEDAS PROGRAMÁTICAS / FALLBACK                      │
│     └──→ REST (/products/search)                            │
│          • Respuesta completa en un JSON                    │
│          • Útil si SSE no está soportado                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Opción 1: SSE (Recomendada)

## Endpoint

```
GET /products/search/hybrid?q={texto}
```

## Cómo funciona

```
Usuario escribe "laptop"
       │
       ▼
┌──────────────────────────────────────┐
│         SSE Stream                   │
├──────────────────────────────────────┤
│                                      │
│  ~50ms  → EVENT { source: 'local' }  │  ✅ Usuario ya ve resultados
│                                      │
│  ~1-3s  → EVENT { source: 'ai' }     │  ✅ Se agregan recomendaciones IA
│                                      │
│          → Stream cerrado            │
└──────────────────────────────────────┘
```

## Payload de cada evento

```typescript
interface HybridSearchStreamPayload {
  source: 'local' | 'ai';
  results: AutocompleteResult[];
}

interface AutocompleteResult {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  category: string | null;
}
```

## Implementación en Next.js (SSE)

### 1. Tipos (types/search.ts)

```typescript
// types/search.ts

export interface AutocompleteResult {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  category: string | null;
}

export interface HybridSearchStreamPayload {
  source: 'local' | 'ai';
  results: AutocompleteResult[];
}
```

### 2. Hook SSE (hooks/useHybridSearchSSE.ts)

```typescript
// hooks/useHybridSearchSSE.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AutocompleteResult } from '@/types/search';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UseHybridSearchSSEReturn {
  query: string;
  setQuery: (q: string) => void;
  localResults: AutocompleteResult[];
  aiResults: AutocompleteResult[];
  isLoadingLocal: boolean;
  isLoadingAi: boolean;
  error: string | null;
  clear: () => void;
}

export function useHybridSearchSSE(debounceMs = 150): UseHybridSearchSSEReturn {
  const [query, setQueryState] = useState('');
  const [localResults, setLocalResults] = useState<AutocompleteResult[]>([]);
  const [aiResults, setAiResults] = useState<AutocompleteResult[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const search = useCallback((searchQuery: string) => {
    // Cerrar conexión anterior
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (searchQuery.length < 1) {
      setLocalResults([]);
      setAiResults([]);
      return;
    }

    setIsLoadingLocal(true);
    setIsLoadingAi(true);
    setError(null);

    const url = `${API_URL}/products/search/hybrid?q=${encodeURIComponent(searchQuery)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.source === 'local') {
          setLocalResults(payload.results);
          setIsLoadingLocal(false);
        }

        if (payload.source === 'ai') {
          setAiResults(payload.results);
          setIsLoadingAi(false);
        }
      } catch (e) {
        console.error('Error parsing SSE:', e);
      }
    };

    eventSource.onerror = () => {
      setError('Error en la conexión');
      setIsLoadingLocal(false);
      setIsLoadingAi(false);
      eventSource.close();
    };

    // El stream se cierra automáticamente cuando el servidor hace complete()
  }, []);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(newQuery);
    }, debounceMs);
  }, [debounceMs, search]);

  const clear = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setQueryState('');
    setLocalResults([]);
    setAiResults([]);
    setError(null);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  return {
    query,
    setQuery,
    localResults,
    aiResults,
    isLoadingLocal,
    isLoadingAi,
    error,
    clear,
  };
}
```

### 3. Componente de Búsqueda SSE (components/SearchBarSSE.tsx)

```typescript
// components/SearchBarSSE.tsx
'use client';

import { useHybridSearchSSE } from '@/hooks/useHybridSearchSSE';
import { Loader2, Search, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function SearchBarSSE() {
  const {
    query,
    setQuery,
    localResults,
    aiResults,
    isLoadingLocal,
    isLoadingAi,
    error,
    clear,
  } = useHybridSearchSSE(150);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);

  // Combinar resultados (local primero, AI después sin duplicados)
  const allResults = [
    ...localResults,
    ...aiResults.filter((ai) => !localResults.some((local) => local.id === ai.id)),
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoadingLocal ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-200
                     transition-all duration-200 outline-none"
        />

        {query && (
          <button onClick={clear} className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Estado */}
      <div className="mt-2 flex items-center gap-4 min-h-[24px]">
        {isLoadingAi && (
          <span className="text-sm text-purple-600 flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Buscando con IA...
          </span>
        )}
        {aiResults.length > 0 && !isLoadingAi && (
          <span className="text-sm text-purple-600 flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            +{aiResults.length} sugerencias IA
          </span>
        )}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {/* Resultados */}
      {allResults.length > 0 && (
        <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {allResults.map((product, index) => {
              const isFromAi = aiResults.some((ai) => ai.id === product.id) &&
                               !localResults.some((local) => local.id === product.id);
              return (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.id}`}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Imagen */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          Sin img
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                        {product.name}
                        {isFromAi && (
                          <Sparkles className="h-3 w-3 text-purple-500" />
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.brand} {product.category && `• ${product.category}`}
                      </p>
                    </div>

                    {/* Precio */}
                    <p className="font-semibold text-gray-900">{formatPrice(product.price)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sin resultados */}
      {query.length >= 1 && !isLoadingLocal && allResults.length === 0 && !error && (
        <div className="mt-4 text-center py-6">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}
```

---

# Opción 2: REST (Fallback)

## Endpoint

```
GET /products/search?q={texto}&ai={true|false}&limit={number}
```

## Parámetros

| Parámetro | Tipo    | Default | Descripción |
|-----------|---------|---------|-------------|
| `q`       | string  | -       | Texto de búsqueda (mínimo 1 carácter) |
| `ai`      | boolean | false   | Incluir resultados de IA |
| `limit`   | number  | 8       | Cantidad de resultados |

## Response

```typescript
interface HybridSearchResponse {
  results: AutocompleteResult[];     // Siempre presente (DB)
  aiResults?: AutocompleteResult[];  // Solo si ai=true
  aiMessage?: string;                // Mensaje de la IA
  source: 'local' | 'hybrid';
}
```

## Implementación en Next.js (REST)

### Hook REST (hooks/useHybridSearchREST.ts)

```typescript
// hooks/useHybridSearchREST.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AutocompleteResult, HybridSearchResponse } from '@/types/search';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UseHybridSearchRESTReturn {
  query: string;
  setQuery: (q: string) => void;
  results: AutocompleteResult[];
  aiResults: AutocompleteResult[];
  aiMessage: string | null;
  isLoading: boolean;
  isLoadingAi: boolean;
  error: string | null;
  searchWithAi: () => Promise<void>;
  clear: () => void;
}

export function useHybridSearchREST(debounceMs = 150): UseHybridSearchRESTReturn {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [aiResults, setAiResults] = useState<AutocompleteResult[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Búsqueda local (sin IA)
  const searchLocal = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort();
    if (q.length < 1) {
      setResults([]);
      setAiResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `${API_URL}/products/search?q=${encodeURIComponent(q)}&limit=8`,
        { signal: abortRef.current.signal }
      );
      const data: HybridSearchResponse = await res.json();
      setResults(data.results);
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setError('Error en la búsqueda');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Búsqueda con IA (cuando presiona Enter)
  const searchWithAi = useCallback(async () => {
    if (query.length < 3) return;

    setIsLoadingAi(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/products/search?q=${encodeURIComponent(query)}&ai=true&limit=8`
      );
      const data: HybridSearchResponse = await res.json();
      setResults(data.results);
      setAiResults(data.aiResults || []);
      setAiMessage(data.aiMessage || null);
    } catch {
      setError('Error en búsqueda IA');
    } finally {
      setIsLoadingAi(false);
    }
  }, [query]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocal(newQuery), debounceMs);
  }, [debounceMs, searchLocal]);

  const clear = useCallback(() => {
    setQueryState('');
    setResults([]);
    setAiResults([]);
    setAiMessage(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    aiResults,
    aiMessage,
    isLoading,
    isLoadingAi,
    error,
    searchWithAi,
    clear,
  };
}
```

### Componente REST (components/SearchBarREST.tsx)

```typescript
// components/SearchBarREST.tsx
'use client';

import { useHybridSearchREST } from '@/hooks/useHybridSearchREST';
import { FormEvent } from 'react';
import { Loader2, Search, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function SearchBarREST() {
  const {
    query,
    setQuery,
    results,
    aiResults,
    aiMessage,
    isLoading,
    isLoadingAi,
    error,
    searchWithAi,
    clear,
  } = useHybridSearchREST(150);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    searchWithAi();
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isLoading || isLoadingAi ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar... (Enter para IA)"
            className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl
                       focus:border-purple-500 focus:ring-2 focus:ring-purple-200
                       transition-all duration-200 outline-none"
          />

          {query && (
            <button type="button" onClick={clear} className="absolute inset-y-0 right-0 pr-4">
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </form>

      {/* Mensaje IA */}
      {aiMessage && (
        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-purple-800 text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {aiMessage}
          </p>
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="mt-2 bg-white border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 bg-gray-50 border-b text-xs text-gray-500">
            {results.length} resultado{results.length !== 1 && 's'}
            {query.length >= 3 && !aiResults.length && (
              <span className="ml-2 text-purple-600">Presiona Enter para búsqueda con IA</span>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y">
            {results.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                  <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                    {p.image ? (
                      <Image src={p.image} alt={p.name} width={40} height={40} className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.brand}</p>
                  </div>
                  <p className="font-semibold">{formatPrice(p.price)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resultados IA separados */}
      {aiResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-purple-600 mb-2 flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Recomendaciones IA
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {aiResults.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="p-3 bg-purple-50 rounded-lg hover:bg-purple-100"
              >
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-sm text-purple-700">{formatPrice(p.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

---

# Comparación

| Característica | SSE | REST |
|----------------|-----|------|
| Velocidad percibida | Instantánea | Normal |
| Resultados DB | Llegan primero (~50ms) | Llegan junto con IA |
| Resultados IA | Llegan después (~1-3s) | Solo si `ai=true` |
| UX | Sin pantalla vacía | Puede tener espera |
| Complejidad frontend | Media (EventSource) | Baja (fetch) |
| Compatibilidad | Navegadores modernos | Universal |
| Soporte en proxies | Puede fallar | Siempre funciona |

---

# Estrategia Recomendada: SSE con Fallback REST

```typescript
// hooks/useHybridSearch.ts
'use client';

import { useEffect, useState } from 'react';
import { useHybridSearchSSE } from './useHybridSearchSSE';
import { useHybridSearchREST } from './useHybridSearchREST';

export function useHybridSearch(debounceMs = 150) {
  const [supportsSSE, setSupportsSSE] = useState(true);

  useEffect(() => {
    // Verificar soporte de SSE
    setSupportsSSE(typeof EventSource !== 'undefined');
  }, []);

  const sseHook = useHybridSearchSSE(debounceMs);
  const restHook = useHybridSearchREST(debounceMs);

  // Usar SSE si está soportado, sino REST
  return supportsSSE ? sseHook : restHook;
}
```

```typescript
// components/SearchBar.tsx
'use client';

import { useHybridSearch } from '@/hooks/useHybridSearch';
// ... resto del componente usa el hook unificado
```

---

# Variables de Entorno

```env
# .env.local (Frontend)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

# Testing

## SSE (Terminal)

```bash
curl -N "http://localhost:3000/products/search/hybrid?q=laptop"
```

Deberías ver dos eventos:
```
data: {"source":"local","results":[...]}

data: {"source":"ai","results":[...]}
```

## REST (Terminal)

```bash
# Sin IA
curl "http://localhost:3000/products/search?q=laptop"

# Con IA
curl "http://localhost:3000/products/search?q=laptop&ai=true"
```

---

# Resumen Final

| Escenario | Usar |
|-----------|------|
| Barra de búsqueda principal | **SSE** (`/products/search/hybrid`) |
| Usuario escribe y quiere ver resultados al instante | **SSE** |
| Navegador viejo / proxy corporativo | **REST** (`/products/search`) |
| Búsqueda programática (desde código) | **REST** |
| API pública / integraciones | **REST** |

**Recomendación**: Implementar SSE como principal y REST como fallback automático.
