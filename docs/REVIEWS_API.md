# API de Reviews - Documentación para Front-End

## Resumen

El módulo de Reviews permite a los clientes dejar reseñas en productos y a los administradores gestionar la visibilidad de las mismas.

---

## Tipos de Respuesta

### ReviewResponsePublic (Para Clientes y Público)

```typescript
{
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  message: string;
  createdAt: string; // ISO Date
  user?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
  };
}
```

### ReviewResponseAdmin (Solo Admin)

```typescript
{
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  message: string;
  isVisible: boolean;        // Solo visible para admin
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;           // Solo visible para admin
  };
  product?: {
    id: string;
    name: string;
  };
}
```

---

## Endpoints

### 1. Crear una Reseña

**`POST /review`**

| Campo | Valor |
|-------|-------|
| Autenticación | Requerida (Bearer Token) |
| Rol | CLIENT |
| Respuesta | `ReviewResponsePublic` |

#### Request Body

```json
{
  "productId": "uuid-del-producto",
  "rating": 5,
  "message": "Excelente producto, muy recomendado!"
}
```

#### Response (201 Created)

```json
{
  "id": "uuid-de-la-review",
  "rating": 5,
  "message": "Excelente producto, muy recomendado!",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Juan Pérez"
  },
  "product": {
    "id": "uuid-del-producto",
    "name": "Camiseta Azul"
  }
}
```

#### Errores

| Código | Mensaje |
|--------|---------|
| 400 | "Ya dejaste un review para este producto" |
| 400 | "El producto con el ID 'xxx' no fue encontrado" |
| 404 | "El usuario con el ID 'xxx' no fue encontrado" |

---

### 2. Obtener Reseñas Públicas de un Producto

**`GET /review/product/:productId/public`**

| Campo | Valor |
|-------|-------|
| Autenticación | NO requerida |
| Rol | Público |
| Respuesta | `ReviewResponsePublic[]` |

> **Nota:** Solo devuelve reseñas con `isVisible: true`

#### Response (200 OK)

```json
[
  {
    "id": "uuid-1",
    "rating": 5,
    "message": "Excelente producto!",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": "uuid-user-1",
      "name": "Juan Pérez"
    },
    "product": {
      "id": "uuid-producto",
      "name": "Camiseta Azul"
    }
  },
  {
    "id": "uuid-2",
    "rating": 4,
    "message": "Muy bueno, llegó rápido",
    "createdAt": "2024-01-14T08:00:00.000Z",
    "user": {
      "id": "uuid-user-2",
      "name": "María García"
    },
    "product": {
      "id": "uuid-producto",
      "name": "Camiseta Azul"
    }
  }
]
```

---

### 3. Verificar si el Usuario Puede Dejar Reseña

**`GET /review/can-review/:productId`**

| Campo | Valor |
|-------|-------|
| Autenticación | Requerida (Bearer Token) |
| Rol | Cualquier usuario autenticado |

> **Uso:** Llamar antes de mostrar el formulario de reseña para verificar si el usuario ya dejó una reseña.

#### Response (200 OK)

**Si puede dejar reseña:**
```json
{
  "canReview": true,
  "hasReviewed": false,
  "message": "Puedes dejar una reseña para este producto"
}
```

**Si ya dejó reseña:**
```json
{
  "canReview": false,
  "hasReviewed": true,
  "message": "Ya has dejado una reseña para este producto"
}
```

---

### 4. Obtener una Reseña por ID

**`GET /review/:id`**

| Campo | Valor |
|-------|-------|
| Autenticación | Requerida (Bearer Token) |
| Rol | CLIENT |
| Respuesta | `ReviewResponsePublic` |

#### Response (200 OK)

```json
{
  "id": "uuid-de-la-review",
  "rating": 5,
  "message": "Excelente producto!",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "user": {
    "id": "uuid-del-usuario",
    "name": "Juan Pérez"
  },
  "product": {
    "id": "uuid-del-producto",
    "name": "Camiseta Azul"
  }
}
```

---

### 5. Eliminar Mi Reseña

**`DELETE /review/:id`**

| Campo | Valor |
|-------|-------|
| Autenticación | Requerida (Bearer Token) |
| Rol | CLIENT |

> **Nota:** Un usuario solo puede eliminar sus propias reseñas.

#### Response (200 OK)

Sin contenido (vacío)

#### Errores

| Código | Mensaje |
|--------|---------|
| 400 | "No puedes eliminar reviews de otros usuarios" |
| 404 | "Review con id xxx no encontrada" |

---

## Endpoints de Administrador

### 6. Listar Todas las Reseñas (Admin)

**`GET /review`**

| Campo | Valor |
|-------|-------|
| Autenticación | Requerida (Bearer Token) |
| Rol | ADMIN |
| Respuesta | `PaginatedReviewsAdminDto` |

> **Nota:** Incluye `isVisible` y muestra TODAS las reseñas (visibles y ocultas)

#### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | 1 | Página actual |
| `limit` | number | 10 | Items por página (max: 100) |
| `rating` | 1-5 | - | Filtrar por calificación |
| `productId` | string | - | Filtrar por producto |
| `userName` | string | - | Buscar por nombre de usuario |

#### Ejemplo de Request

```
GET /review?page=1&limit=10&rating=5&userName=Juan
```

#### Response (200 OK)

```json
{
  "items": [
    {
      "id": "uuid-1",
      "rating": 5,
      "message": "Excelente producto!",
      "isVisible": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": "uuid-user",
        "name": "Juan Pérez",
        "email": "juan@email.com"
      },
      "product": {
        "id": "uuid-producto",
        "name": "Camiseta Azul"
      }
    },
    {
      "id": "uuid-2",
      "rating": 1,
      "message": "Reseña ofensiva que fue ocultada",
      "isVisible": false,
      "createdAt": "2024-01-14T08:00:00.000Z",
      "updatedAt": "2024-01-14T12:00:00.000Z",
      "user": {
        "id": "uuid-user-2",
        "name": "Usuario Malo",
        "email": "malo@email.com"
      },
      "product": {
        "id": "uuid-producto",
        "name": "Camiseta Azul"
      }
    }
  ],
  "total": 50,
  "pages": 5
}
```

---

### 7. Obtener Todas las Reseñas de un Producto (Admin)

**`GET /review/product/:productId`**

| Campo | Valor |
|-------|-------|
| Autenticación | Requerida (Bearer Token) |
| Rol | ADMIN |
| Respuesta | `ReviewResponseAdmin[]` |

> **Nota:** Incluye TODAS las reseñas (visibles y ocultas) con `isVisible`

#### Response (200 OK)

```json
[
  {
    "id": "uuid-1",
    "rating": 5,
    "message": "Excelente!",
    "isVisible": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": "uuid-user",
      "name": "Juan",
      "email": "juan@email.com"
    },
    "product": {
      "id": "uuid-producto",
      "name": "Camiseta"
    }
  },
  {
    "id": "uuid-2",
    "rating": 1,
    "message": "Reseña oculta",
    "isVisible": false,
    "createdAt": "2024-01-14T08:00:00.000Z",
    "updatedAt": "2024-01-14T12:00:00.000Z",
    "user": {
      "id": "uuid-user-2",
      "name": "Pedro",
      "email": "pedro@email.com"
    },
    "product": {
      "id": "uuid-producto",
      "name": "Camiseta"
    }
  }
]
```

---

### 8. Cambiar Visibilidad de una Reseña (Admin)

**`PATCH /review/:id/visibility`**

| Campo | Valor |
|-------|-------|
| Autenticación | Requerida (Bearer Token) |
| Rol | ADMIN |
| Respuesta | `ReviewResponseAdmin` |

> **Nota:** Alterna el estado de `isVisible` (true → false, false → true)

#### Response (200 OK)

```json
{
  "id": "uuid-de-la-review",
  "rating": 1,
  "message": "Reseña ofensiva",
  "isVisible": false,
  "createdAt": "2024-01-14T08:00:00.000Z",
  "updatedAt": "2024-01-15T14:00:00.000Z",
  "user": {
    "id": "uuid-user",
    "name": "Usuario",
    "email": "usuario@email.com"
  },
  "product": {
    "id": "uuid-producto",
    "name": "Camiseta"
  }
}
```

---

## Valores de Rating

```typescript
enum Rating {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5
}
```

---

## Resumen de Endpoints

| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| POST | `/review` | CLIENT | Crear reseña |
| GET | `/review` | ADMIN | Listar todas (paginado) |
| GET | `/review/:id` | CLIENT | Obtener una reseña |
| GET | `/review/product/:productId/public` | PÚBLICO | Reseñas visibles de producto |
| GET | `/review/product/:productId` | ADMIN | Todas las reseñas de producto |
| GET | `/review/can-review/:productId` | AUTH | Verificar si puede reseñar |
| PATCH | `/review/:id/visibility` | ADMIN | Toggle visibilidad |
| DELETE | `/review/:id` | CLIENT | Eliminar mi reseña |

---

## Flujo Típico para Front-End

### Para mostrar reseñas en página de producto (público):

```javascript
// 1. Obtener reseñas públicas del producto
const reviews = await fetch(`/review/product/${productId}/public`);
```

### Para mostrar formulario de reseña (usuario logueado):

```javascript
// 1. Verificar si puede dejar reseña
const { canReview } = await fetch(`/review/can-review/${productId}`, {
  headers: { Authorization: `Bearer ${token}` }
});

// 2. Si canReview es true, mostrar formulario
if (canReview) {
  // Mostrar formulario
}

// 3. Al enviar reseña
await fetch('/review', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    productId: 'uuid-producto',
    rating: 5,
    message: 'Excelente producto!'
  })
});
```

### Panel de Admin - Gestión de reseñas:

```javascript
// 1. Listar todas las reseñas con filtros
const { items, total, pages } = await fetch('/review?page=1&limit=10', {
  headers: { Authorization: `Bearer ${adminToken}` }
});

// 2. Ocultar una reseña inapropiada
await fetch(`/review/${reviewId}/visibility`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${adminToken}` }
});
```
