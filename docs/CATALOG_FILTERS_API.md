# API de Filtros del Catálogo de Productos

## Endpoint Base

```
GET /products
```

**Autenticación:** No requerida (endpoint público)

---

## Parámetros de Query Disponibles

### Paginación

| Parámetro | Tipo   | Requerido | Default | Min | Max | Descripción                      |
| --------- | ------ | --------- | ------- | --- | --- | -------------------------------- |
| `page`    | number | No        | 1       | 1   | -   | Número de página a obtener       |
| `limit`   | number | No        | 10      | 1   | 100 | Cantidad de productos por página |

### Filtros de Búsqueda

| Parámetro    | Tipo          | Requerido | Min Length | Max Length | Descripción                                                |
| ------------ | ------------- | --------- | ---------- | ---------- | ---------------------------------------------------------- |
| `name`       | string        | No        | 3          | 80         | Buscar por nombre del producto (parcial, case-insensitive) |
| `brand`      | string        | No        | 2          | 50         | Filtrar por marca del producto (parcial, case-insensitive) |
| `categoryId` | string (UUID) | No        | -          | -          | Filtrar por ID de categoría exacto                         |
| `color`      | string        | No        | 2          | 50         | Filtrar por color de variante (parcial, case-insensitive)  |
| `featured`   | boolean       | No        | -          | -          | Filtrar solo productos destacados (`true`/`false`)         |

### Filtros de Precio

| Parámetro  | Tipo   | Requerido | Min Value | Descripción                                |
| ---------- | ------ | --------- | --------- | ------------------------------------------ |
| `minPrice` | number | No        | 0         | Precio mínimo del producto                 |
| `maxPrice` | number | No        | 0         | Precio máximo del producto                 |
| `price`    | number | No        | 0.01      | Buscar productos en rango de precio (±10%) |

> **Nota sobre filtros de precio:**
>
> - Usa `minPrice` y `maxPrice` para rangos exactos (ej: productos entre $100 y $500)
> - Usa `price` para búsquedas aproximadas (ej: productos alrededor de $1000)
> - Si usas `minPrice`/`maxPrice`, el parámetro `price` será ignorado

---

## Estructura de Respuesta

```typescript
interface PaginatedProductsResponse {
  items: ProductDto[]; // Array de productos
  total: number; // Total de productos que coinciden con los filtros
  pages: number; // Total de páginas disponibles
}

interface ProductDto {
  id: string; // UUID del producto
  name: string; // Nombre del producto
  description: string; // Descripción
  brand: string; // Marca
  model: string | null; // Modelo (puede ser null)
  basePrice: number; // Precio base
  baseStock: number; // Stock base
  isActive: boolean; // Estado activo
  hasVariants: boolean; // Si tiene variantes
  featured: boolean; // Si es destacado
  createdAt: string; // Fecha de creación (ISO 8601)
  updatedAt: string; // Fecha de actualización (ISO 8601)
  category: {
    id: string;
    category_name: string;
  } | null;
  variants: VariantDto[]; // Array de variantes
  files: FileDto[]; // Array de archivos/imágenes
  reviews: ReviewDto[]; // Array de reseñas
}

interface VariantDto {
  id: string;
  type: 'ram' | 'storage' | 'color' | 'size' | 'material' | 'connectivity';
  name: string;
  description: string | null;
  priceModifier: number; // Modificador de precio (+/-)
  stock: number;
  isAvailable: boolean;
  sortOrder: number;
}
```

---

## Ejemplos de Uso

### 1. Obtener todos los productos (paginados)

```javascript
// Primera página con 10 productos (valores por defecto)
fetch('/products');

// Página 2 con 20 productos
fetch('/products?page=2&limit=20');
```

### 2. Buscar por nombre

```javascript
// Buscar productos que contengan "laptop" en el nombre
fetch('/products?name=laptop');

// Buscar "Dell" con paginación
fetch('/products?name=Dell&page=1&limit=15');
```

### 3. Filtrar por marca

```javascript
// Todos los productos de marca "Apple"
fetch('/products?brand=Apple');

// Productos Logitech, página 1
fetch('/products?brand=Logitech&limit=12');
```

### 4. Filtrar por categoría

```javascript
// Productos de una categoría específica
fetch('/products?categoryId=123e4567-e89b-12d3-a456-426614174000');
```

### 5. Filtrar por color

```javascript
// Productos con variante de color "Negro"
fetch('/products?color=Negro');

// Productos color "Blanco" o "White"
fetch('/products?color=blanco');
fetch('/products?color=white');
```

### 6. Filtrar por rango de precios

```javascript
// Productos entre $100 y $500
fetch('/products?minPrice=100&maxPrice=500');

// Productos de $1000 o más
fetch('/products?minPrice=1000');

// Productos de hasta $200
fetch('/products?maxPrice=200');
```

### 7. Buscar por precio aproximado (±10%)

```javascript
// Productos alrededor de $1000 (rango: $900 - $1100)
fetch('/products?price=1000');
```

### 8. Filtrar productos destacados

```javascript
// Solo productos destacados
fetch('/products?featured=true');

// Solo productos NO destacados
fetch('/products?featured=false');
```

### 9. Combinación de múltiples filtros

```javascript
// Laptops Dell entre $800 y $1500, destacados
fetch('/products?name=laptop&brand=Dell&minPrice=800&maxPrice=1500&featured=true');

// Productos negros de Apple, página 2
fetch('/products?brand=Apple&color=negro&page=2&limit=10');

// Productos de categoría específica con color rojo, ordenados por defecto
fetch('/products?categoryId=abc123&color=rojo&limit=20');
```

---

## Implementación en React (Ejemplo)

### Hook personalizado para filtros

```typescript
// hooks/useProductFilters.ts
import { useState, useCallback } from 'react';

interface ProductFilters {
  page?: number;
  limit?: number;
  name?: string;
  brand?: string;
  categoryId?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  price?: number;
  featured?: boolean;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages: number;
}

export const useProductFilters = () => {
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 12,
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);

  const buildQueryString = useCallback((filters: ProductFilters): string => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }, []);

  const fetchProducts = useCallback(
    async (newFilters?: Partial<ProductFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      setLoading(true);

      try {
        const queryString = buildQueryString(updatedFilters);
        const response = await fetch(`/products?${queryString}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    },
    [filters, buildQueryString],
  );

  const updateFilter = useCallback(
    (key: keyof ProductFilters, value: any) => {
      // Resetear a página 1 cuando cambian los filtros
      fetchProducts({ [key]: value, page: 1 });
    },
    [fetchProducts],
  );

  const clearFilters = useCallback(() => {
    fetchProducts({
      page: 1,
      limit: 12,
      name: undefined,
      brand: undefined,
      categoryId: undefined,
      color: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      price: undefined,
      featured: undefined,
    });
  }, [fetchProducts]);

  const goToPage = useCallback(
    (page: number) => {
      fetchProducts({ page });
    },
    [fetchProducts],
  );

  return {
    filters,
    data,
    loading,
    fetchProducts,
    updateFilter,
    clearFilters,
    goToPage,
  };
};
```

### Componente de filtros del catálogo

```tsx
// components/CatalogFilters.tsx
import React from 'react';

interface CatalogFiltersProps {
  filters: ProductFilters;
  categories: Category[];
  onFilterChange: (key: string, value: any) => void;
  onClear: () => void;
}

export const CatalogFilters: React.FC<CatalogFiltersProps> = ({
  filters,
  categories,
  onFilterChange,
  onClear,
}) => {
  return (
    <div className="catalog-filters">
      {/* Búsqueda por nombre */}
      <div className="filter-group">
        <label>Buscar producto</label>
        <input
          type="text"
          placeholder="Nombre del producto..."
          value={filters.name || ''}
          onChange={(e) => onFilterChange('name', e.target.value || undefined)}
          minLength={3}
        />
      </div>

      {/* Filtro por marca */}
      <div className="filter-group">
        <label>Marca</label>
        <input
          type="text"
          placeholder="Marca..."
          value={filters.brand || ''}
          onChange={(e) => onFilterChange('brand', e.target.value || undefined)}
        />
      </div>

      {/* Filtro por categoría */}
      <div className="filter-group">
        <label>Categoría</label>
        <select
          value={filters.categoryId || ''}
          onChange={(e) => onFilterChange('categoryId', e.target.value || undefined)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.category_name}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro por color */}
      <div className="filter-group">
        <label>Color</label>
        <input
          type="text"
          placeholder="Color..."
          value={filters.color || ''}
          onChange={(e) => onFilterChange('color', e.target.value || undefined)}
        />
      </div>

      {/* Rango de precios */}
      <div className="filter-group price-range">
        <label>Rango de precio</label>
        <div className="price-inputs">
          <input
            type="number"
            placeholder="Mín"
            min={0}
            value={filters.minPrice || ''}
            onChange={(e) =>
              onFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)
            }
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Máx"
            min={0}
            value={filters.maxPrice || ''}
            onChange={(e) =>
              onFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>
      </div>

      {/* Filtro destacados */}
      <div className="filter-group">
        <label>
          <input
            type="checkbox"
            checked={filters.featured === true}
            onChange={(e) => onFilterChange('featured', e.target.checked ? true : undefined)}
          />
          Solo productos destacados
        </label>
      </div>

      {/* Botón limpiar */}
      <button onClick={onClear} className="clear-filters-btn">
        Limpiar filtros
      </button>
    </div>
  );
};
```

### Componente principal del catálogo

```tsx
// pages/Catalog.tsx
import React, { useEffect } from 'react';
import { useProductFilters } from '../hooks/useProductFilters';
import { CatalogFilters } from '../components/CatalogFilters';
import { ProductCard } from '../components/ProductCard';
import { Pagination } from '../components/Pagination';

export const Catalog: React.FC = () => {
  const { filters, data, loading, fetchProducts, updateFilter, clearFilters, goToPage } =
    useProductFilters();

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="catalog-page">
      <aside className="filters-sidebar">
        <CatalogFilters
          filters={filters}
          categories={categories} // Obtener de otro hook o context
          onFilterChange={updateFilter}
          onClear={clearFilters}
        />
      </aside>

      <main className="products-grid">
        {loading ? (
          <div className="loading">Cargando productos...</div>
        ) : (
          <>
            <div className="results-info">
              <p>
                Mostrando {data?.items.length} de {data?.total} productos
              </p>
            </div>

            <div className="products">
              {data?.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {data && data.pages > 1 && (
              <Pagination
                currentPage={filters.page || 1}
                totalPages={data.pages}
                onPageChange={goToPage}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
```

---

## Colores Disponibles en Productos (Seed Data)

Los siguientes productos tienen variantes de color disponibles:

| Producto              | Colores Disponibles                 |
| --------------------- | ----------------------------------- |
| Logitech MX Master 3S | Negro, Gris                         |
| HyperX Cloud II       | Negro/Rojo, Negro/Gun Metal         |
| Blue Yeti USB         | Blackout, Silver, Midnight Blue     |
| NZXT H510             | Matte Black, Matte White, Matte Red |

**Ejemplo de búsqueda por color:**

```javascript
// Buscar productos negros
fetch('/products?color=negro');
fetch('/products?color=black');
fetch('/products?color=Blackout');

// Buscar productos blancos
fetch('/products?color=white');
fetch('/products?color=blanco');
```

---

## Notas Importantes

1. **Case-insensitive:** Los filtros `name`, `brand` y `color` no distinguen mayúsculas/minúsculas.

2. **Búsqueda parcial:** Los filtros `name`, `brand` y `color` buscan coincidencias parciales
   (contiene).

3. **Orden de resultados:** Los productos se ordenan por fecha de creación descendente (más
   recientes primero).

4. **Productos activos:** Solo se retornan productos con `isActive: true`.

5. **Filtro de color:** Busca en las variantes de tipo `color` del producto, no en un campo directo.

6. **Prioridad de precios:**
   - Si se especifica `minPrice` y/o `maxPrice`, estos tienen prioridad
   - El filtro `price` solo se aplica si no hay `minPrice` ni `maxPrice`

7. **Validaciones:**
   - `name`: mínimo 3 caracteres, máximo 80
   - `brand`: mínimo 2 caracteres, máximo 50
   - `color`: mínimo 2 caracteres, máximo 50
   - `limit`: máximo 100 productos por página
   - `minPrice`/`maxPrice`: valor mínimo 0
   - `price`: valor mínimo 0.01

---

## Endpoint Relacionado: Búsqueda Avanzada (Home)

Para la barra de búsqueda del Home (estilo Google), usar:

```
GET /products/search
```

Este endpoint está optimizado para búsquedas rápidas y retorna resultados relevantes basados en
nombre, descripción y marca.

```javascript
// Búsqueda desde la barra del home
fetch('/products/search?query=laptop&limit=5');
```

---

## Respuestas de Error

| Código | Descripción                          |
| ------ | ------------------------------------ |
| 400    | Parámetros de validación incorrectos |
| 500    | Error interno del servidor           |

**Ejemplo de error 400:**

```json
{
  "statusCode": 400,
  "message": ["name must be longer than or equal to 3 characters"],
  "error": "Bad Request"
}
```
