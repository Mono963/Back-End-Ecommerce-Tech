# BACKEND_INTEGRATION_GUIDE

Document status: generated from full source audit (`src/**`, `config/**`, `migrations/**`, `seeds/**`, `mail templates`)  
Project root: `c:\Users\Lucio\Desktop\Back-end-ecommerce`  
Audit date: `2026-03-01`

## 0) Alcance de auditoria

Este documento fue construido revisando:

- Todos los modulos registrados en `AppModule`.
- Todos los controladores y endpoints.
- Todos los servicios y validaciones de negocio.
- Todos los DTOs.
- Todas las entidades y relaciones TypeORM.
- Guards, middleware, pipes, filter global y configuracion base.
- Flujos async (Bull queues, processors, cron jobs).
- Webhooks (MercadoPago).
- Integraciones externas (MercadoPago, Google OAuth, Cloudinary, n8n, SMTP).
- Seeds y migraciones relevantes para comportamiento runtime.

No hay contenido inventado en este documento: todo esta basado en el codigo actual.

---

## 1) Vision General del Sistema

### 1.1 Arquitectura general

- Framework: NestJS (modular monolith).
- DB: PostgreSQL + TypeORM (`synchronize: false`).
- Cache: `@nestjs/cache-manager` (memoria si no hay Redis; Redis si `REDIS_URL`/`REDIS_HOST`).
- Queues: Bull (`mail`, `newsletter`) con retries/backoff.
- Seguridad global:
  - `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).
  - `AllExceptionsFilter` global.
  - `ThrottlerGuard` global (60 req/min default).
  - `helmet` + `compression`.
  - CORS con `credentials: true` y origins por `CORS_ORIGINS`.

### 1.2 Modulos funcionales

- Auth
- Users
- Roles
- Products
- Categories
- Cart
- Orders
- Payments
- MercadoPago
- Discounts
- Review
- Wishlist
- Newsletter + Campaigns
- Contact
- File uploads
- Health
- N8N (AI/hybrid search)
- Seeds bootstrap

### 1.3 Autenticacion real (JWT + cookie parcial)

- JWT firmado con `SUPABASE_JWT_SECRET`.
- `AuthGuard` **solo** acepta `Authorization: Bearer <token>`.
- Flujo OAuth tiene cookie:
  - `POST /auth/exchange-code` setea `access_token` cookie `HttpOnly`.
  - `POST /auth/logout` limpia esa cookie.
- Importante: los guards actuales no leen cookie, leen header Bearer.

### 1.4 Roles y RBAC real

Roles definidos:

- `CLIENT`
- `ADMIN`
- `SUPER_ADMIN`

Jerarquia efectiva en `RoleGuard`:

- `SUPER_ADMIN` => `SUPER_ADMIN`, `ADMIN`, `CLIENT`
- `ADMIN` => `ADMIN`, `CLIENT`
- `CLIENT` => `CLIENT`

Respuesta sin permisos:

- `401` si no hay token o token invalido.
- `403` si rol insuficiente (mensaje incluye roles requeridos y rol actual).

### 1.5 Manejo de errores HTTP

Formato global real (filter):

```json
{
  "statusCode": 400,
  "timestamp": "2026-03-01T12:00:00.000Z",
  "path": "/ruta",
  "error": "mensaje-o-objeto"
}
```

`error` puede ser:

- string
- objeto de Nest (ejemplo validacion con `message[]`, `error`, `statusCode`)
- objeto de negocio (ejemplo checkout con `issues`)

### 1.6 Estructura de respuestas exitosas

- No existe envelope global de exito.
- Cada endpoint devuelve su propio shape.
- Paginacion compartida:

```json
{
  "total": 123,
  "pages": 13,
  "items": []
}
```

### 1.7 Flujos async (colas, jobs, cron, streams, webhooks)

- Queue `mail`:
  - login, welcome, password reset/change, contacto, lifecycle de orden, pagos, carrito abandonado, review request.
- Queue `newsletter`:
  - newsletters welcome/monthly/promo/custom campaign.
- Cron:
  - carrito abandonado: cada hora.
  - newsletter mensual: dia 1, 09:00 (America/Argentina/Buenos_Aires).
- SSE:
  - `GET /products/search/hybrid`.
- Webhook:
  - `POST /payments/webhook`.

---

## 2) Autenticacion

### 2.1 Endpoints

| Metodo | URL | Acceso | Body esperado | Respuesta exitosa real | Errores y validaciones | Cookies |
|---|---|---|---|---|---|---|
| POST | `/auth/singin/user` | PUBLIC | `{ email, password }` | `{ accessToken, expiresIn, user }` | `400` faltan credenciales, `401` credenciales invalidas, throttle `5/min` | No |
| POST | `/auth/singup` | PUBLIC | `CreateUserDto` | `UserResponseDto` | `400` datos invalidos, `401` email registrado, `409` username existente, throttle `3/min` | No |
| GET | `/auth/google` | PUBLIC | - | redireccion OAuth Google | error OAuth si falla | No |
| GET | `/auth/google/callback` | PUBLIC | - | redireccion frontend `.../auth/callback?code=<uuid>` | redireccion a `/auth/error?message=...` si falla | No |
| POST | `/auth/exchange-code` | PUBLIC | `{ code }` | `{ userId, success: true }` | `401` code invalido/expirado, throttle `10/min` | `Set-Cookie access_token` |
| POST | `/auth/logout` | PUBLIC | - | `{ success: true }` | no valida token | `clearCookie(access_token)` |

### 2.2 Respuesta real de login (`POST /auth/singin/user`)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "4e5a24d5-75ef-42d2-a15a-17f0428f8bd9",
    "name": "Lucio",
    "email": "lucio@example.com",
    "role": "CLIENT",
    "username": "lucio",
    "phone": "5491112345678",
    "birthDate": "1995-08-17"
  }
}
```

Nota: `expiresIn: 3600` se devuelve en la respuesta pero el JWT no incluye `expiresIn` en `jwt.sign()`. El token puede no expirar server-side.

### 2.3 Validaciones y detalles de negocio

- `CreateUserDto` (campos completos):

| Campo | Tipo | Validacion |
|---|---|---|
| `name` | string | requerido, 3-80 chars |
| `email` | string | requerido, email valido |
| `birthDate` | string | requerido, formato ISO date (`YYYY-MM-DD`) |
| `phone` | string | opcional, formato E.164 (`+541112345678`) |
| `username` | string | requerido, 3-80 chars |
| `password` | string | requerido, 8-15 chars, regex: mayuscula + minuscula + numero + especial (`!@#$%^&*`) |
| `confirmPassword` | string | requerido, misma regex que password |
- Signup:
  - crea rol CLIENT si no existe.
  - guarda password hasheado.
  - encola email welcome.
- Signin:
  - valida password con bcrypt.
  - encola email login notification.
- OAuth code exchange:
  - `auth code` guardado en cache con TTL `30000` ms.
  - se invalida al hacer exchange.

### 2.4 Flujo frontend recomendado (codigo actual)

#### Flujo credenciales

1. `POST /auth/singup` (registro).
2. `POST /auth/singin/user` (login).
3. Guardar `accessToken` y enviarlo en `Authorization: Bearer <token>`.
4. `POST /auth/logout` solo limpia cookie, no invalida JWT server-side.

#### Flujo Google OAuth

1. Navegar a `GET /auth/google`.
2. Recibir redirect frontend con `code`.
3. Enviar `POST /auth/exchange-code` con `code`.
4. Backend setea cookie `access_token`.

Importante para frontend:

- El guard actual no lee cookie.
- `exchange-code` no devuelve access token en body.
- Con codigo actual, para endpoints protegidos se necesita Bearer token.

---

## 3) Productos

### 3.1 Endpoints de catalogo (publicos)

| Metodo | URL | Params/Query | Respuesta real | Errores reales |
|---|---|---|---|---|
| GET | `/products` | `page,limit,name,brand,categoryId,color,minPrice,maxPrice,basePrice,featured` | `{ total, pages, items: ResponseProductDto[] }` | `400` si mezcla `basePrice` con `minPrice/maxPrice` |
| GET | `/products/featured` | `limit` (default 10) | `ResponseProductDto[]` | - |
| GET | `/products/brand/:brand` | path brand | `ResponseProductDto[]` | - |
| GET | `/products/category/:categoryId` | path UUID | `ResponseProductDto[]` | `404` categoria inexistente |
| GET | `/products/:id/related` | path UUID, `limit` default 6 | `ResponseProductDto[]` | `404` producto inexistente |
| GET | `/products/:id` | path UUID | `ResponseProductDto` | `404` |
| GET | `/products/:id/price` | `variants=uuid1,uuid2` | `{ productId, variantIds, finalPrice }` | `404` producto, `400` variantes invalidas o repetidas por tipo |
| GET | `/products/:id/stock` | `variants=uuid1,uuid2` | `{ productId, variantIds, availableStock }` | `404` producto, `400` variantes no disponibles |
| GET (SSE) | `/products/search/hybrid?q=...` | `q` | stream SSE | sin eventos para query corta |

### 3.2 Endpoints admin de productos

| Metodo | URL | Acceso | Body | Respuesta | Errores |
|---|---|---|---|---|---|
| POST | `/products` | ADMIN+ | `CreateProductDto` | `ResponseProductDto` | `404` categoria, `400` duplicado |
| PUT | `/products/:id` | ADMIN+ | `UpdateProductDto` | `ResponseProductDto` | `404`, `400` nombre duplicado |
| DELETE | `/products/:id` | ADMIN+ | - | `{ id, message }` | `404` |
| POST | `/products/:id/variants` | ADMIN+ | `CreateVariantDto` | `ProductVariant` | `404`, `400` duplicada |
| PUT | `/products/variants/:variantId` | ADMIN+ | parcial `CreateVariantDto` | `ProductVariant` | `404`, `400` duplicada |
| DELETE | `/products/variants/:variantId` | ADMIN+ | - | `{ id, message }` | `404` |
| POST | `/products/seeder` | ADMIN+ | - | `{ message, total }` | devuelve `total: 0` si ya hay productos/categorias faltantes |

### 3.3 Paginacion y filtros reales

- `limit`: default `10`, min `1`, max `100`.
- `page`: default `1`.
- Filtros combinables:
  - `name` (ILIKE)
  - `brand` (ILIKE)
  - `categoryId`
  - `color` (sobre variantes tipo `color`)
  - `featured`
  - `minPrice/maxPrice`
  - `basePrice` (+/- 10%, incluyendo combinacion con variantes)

### 3.4 Estructura real de producto (`ResponseProductDto`)

Campos clave:

- `originalPrice`: `basePrice + variante disponible mas barata` (si tiene variantes).
- `finalPrice`: `originalPrice` menos descuento automatico activo de producto.
- `hasActiveDiscount`, `discountAmount`, `discountPercentage`, `discountEndDate`.
- `totalStock`: suma de variantes disponibles o `baseStock`.
- `imgUrls`: merge sin duplicados entre `product.imgUrls` y `files.url`.

### 3.5 SSE de busqueda AI/hibrida

Endpoint:

- `GET /products/search/hybrid?q=<texto>`

Comportamiento real:

- Si `q` tiene menos de 2 caracteres: no emite eventos (`EMPTY`).
- Emite primero `source: "local"` con autocomplete DB.
- Intenta luego `source: "ai"` via n8n.
- Si n8n falla o esta deshabilitado, el stream se completa sin evento AI.

Payload de cada mensaje SSE:

```json
{
  "source": "local",
  "results": [
    {
      "id": "uuid",
      "name": "Producto",
      "brand": "Marca",
      "basePrice": 100,
      "image": "https://...",
      "category": "Laptops"
    }
  ],
  "message": "optional"
}
```

Ejemplo frontend (EventSource):

```ts
const es = new EventSource(`${API_URL}/products/search/hybrid?q=${encodeURIComponent(query)}`);

es.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  // payload.source => "local" | "ai"
  // payload.results => array
};

es.onerror = () => {
  es.close();
};
```

### 3.6 Nota importante de pricing

- `GET /products/:id/price` calcula `base + variantes` y **no aplica descuentos**.
- Los descuentos se aplican en:
  - `ResponseProductDto.finalPrice` (catalogo/detalle: descuento automatico de producto).
  - Checkout (`/cart/preview-discounts`, `/cart/checkout`) para regla admin vs code.

---

## 4) Carrito y Checkout

### 4.1 Endpoints carrito

| Metodo | URL | Body | Respuesta real | Validaciones / errores |
|---|---|---|---|---|
| GET | `/cart/my-cart` | - | `CartResponseDto` | crea carrito si no existe |
| GET | `/cart/summary` | - | `{ itemCount, total, hasItems }` | si no hay carrito: `{0,0,false}` |
| POST | `/cart/preview-discounts` | `{ promoCode? }` | `CartDiscountPreviewResponseDto` | `promoValid=false` + `promoErrors[]` |
| POST | `/cart/add` | `{ productId, quantity, variantIds? }` | `CartResponseDto` | `400` stock, variantes obligatorias/invalidas, `404` producto/usuario |
| PUT | `/cart/items/:cartItemId` | `{ quantity }` | `CartResponseDto` | `404` item/carrito, `400` stock |
| DELETE | `/cart/items/:cartItemId` | - | `{ message, cart }` | `404` |
| DELETE | `/cart/clear` | - | `{ message }` | `404` carrito inexistente |
| POST | `/cart/validate-stock` | - | `{ valid, issues[] }` | valida disponibilidad actual |
| POST | `/cart/select-address` | `{ addressId }` | `{ message }` | `400` address no pertenece al usuario |
| GET | `/cart/selected-address` | - | `{ selectedAddressId }` | `404` si no hay carrito |
| POST | `/cart/checkout` | `{ shippingAddress, promoCode? }` | `ResponseOrderDto` | `400` por stock, promo invalida, carrito vacio, direccion faltante |

**Campos de `shippingAddress` (CreateAddressDto):**

| Campo | Tipo | Notas |
|---|---|---|
| `label` | string | max 50 chars (ej: "Casa", "Trabajo") |
| `street` | string | max 255 chars |
| `city` | string | max 100 chars |
| `province` | string | max 100 chars |
| `postalCode` | string | max 20 chars |
| `country` | string | max 100 chars, default `"Argentina"` |
| `isDefault` | boolean | default `false` |

Acceso real: clase con `@Roles(CLIENT)` + jerarquia => CLIENT/ADMIN/SUPER_ADMIN.

### 4.2 Validacion de variantes y stock (real)

Reglas en `add`:

- Si producto tiene variantes y no envias `variantIds`: error.
- Si producto no tiene variantes y envias `variantIds`: error.
- No se puede elegir mas de una variante del mismo tipo.
- Variantes deben existir, pertenecer al producto y estar disponibles.
- Stock insuficiente en add/update: error 400.

### 4.3 Preview de descuentos (mismo motor que checkout)

`POST /cart/preview-discounts` devuelve:

- `subtotalOriginal`
- `subtotalWithDiscount`
- `totalDiscount`
- `tax`
- `shipping`
- `total`
- `promoValid`
- `promoErrors[]`
- `items[]` por linea (source y code aplicado)

### 4.4 Checkout real (`/cart/checkout`)

Flujo real:

1. Valida stock del carrito (`validateCartStock`).
2. Agrega direccion al usuario (`usersService.addAddress`).
3. Crea orden + detalle + items.
4. Aplica descuentos (admin vs code).
5. Calcula impuesto/envio:
   - `TAX_RATE = 0.21`
   - envio gratis >= 250
   - envio reducido 10 para subtotal >= 100
   - envio estandar 20 para subtotal < 100
6. Descuenta stock de producto/variantes.
7. Limpia carrito.

Estado inicial de la orden: `pending`.

### 4.5 Que debe mostrar frontend por etapa

1. Carrito:
   - items, variantes elegidas, `priceAtAddition`, subtotales.
2. Validacion de stock:
   - bloquear checkout si `valid=false`.
3. Promo code:
   - usar `promoValid` y `promoErrors`.
4. Totales:
   - mostrar subtotal original, descuento, impuesto, envio, total.
5. Post-checkout:
   - mostrar `orderNumber` y avanzar al flujo de pago.

---

## 5) Ordenes

### 5.1 Estados posibles y significado

| Estado | Significado |
|---|---|
| `pending` | orden creada, esperando pago |
| `paid` | pago aprobado |
| `processing` | orden en preparacion |
| `shipped` | orden despachada |
| `delivered` | orden entregada |
| `cancelled` | orden cancelada |

### 5.2 Transiciones validas (`OrderValidations`)

- `pending -> paid`
- `paid -> processing`
- `processing -> shipped`
- `shipped -> delivered`
- `delivered` y `cancelled` no avanzan

### 5.3 Endpoints de ordenes

| Metodo | URL | Acceso efectivo | Uso |
|---|---|---|---|
| GET | `/orders` | ADMIN+ | listado global con filtros/paginacion |
| GET | `/orders/my-orders` | CLIENT+ | historial del usuario |
| GET | `/orders/stats` | ADMIN+ | metricas agregadas |
| GET | `/orders/:id` | CLIENT+ | detalle (si rol CLIENT: solo su orden) |
| PUT | `/orders/:id/status?status=...` | ADMIN+ | cambio de estado operativo |
| POST | `/orders/:id/cancel` | CLIENT+ | cancelacion con razon |

Nota importante sobre `PUT /orders/:id/status`:

- Este endpoint usa `OrderStatusadmin` (no incluye `cancelled`).
- Admin solo puede avanzar a: `pending`, `paid`, `processing`, `shipped`, `delivered`.
- Para cancelar, usar `POST /orders/:id/cancel` (disponible para CLIENT+).

### 5.4 Cancelacion real

- Solo en estados `pending` o `paid`.
- Cambia estado a `cancelled`.
- Guarda `cancellationReason`.
- Restaura stock.
- Envia email de cancelacion.
- Si estaba `paid`, envia tambien email de refund processed (informativo).

### 5.5 Restricciones frontend

- Usuario final no puede avanzar estados manualmente.
- No puede cancelar `processing`, `shipped` o `delivered`.
- Para estado final canonico de UI usar `orders.status`.

---

## 6) Pagos (MercadoPago)

### 6.1 Crear preferencia

| Metodo | URL | Acceso | Body | Respuesta |
|---|---|---|---|---|
| POST | `/payments/create-preference` | Auth (cualquier rol) | `{ orderId, message?, currency? }` | `{ preferenceId, initPoint, sandboxInitPoint }` |

Validaciones reales:

- La orden debe existir y pertenecer al usuario autenticado.
- `order.orderDetail.total > 0`.
- `FRONTEND_MP_URL` y `BACKEND_MP_URL` deben existir.

### 6.2 Que recibe frontend

- `initPoint`: URL checkout MercadoPago.
- `sandboxInitPoint`: URL sandbox.

Redirecciones configuradas:

- `${FRONTEND_MP_URL}/orders/success`
- `${FRONTEND_MP_URL}/orders/failure`
- `${FRONTEND_MP_URL}/orders/pending`

### 6.3 Webhook real (`POST /payments/webhook`)

Acceso: PUBLIC (`@SkipThrottle`).

Comportamiento:

1. Verifica firma HMAC si existe `MP_WEBHOOK_SECRET`.
2. Si firma invalida: responde `200 { status: "invalid_signature" }`.
3. Soporta eventos `payment` y `merchant_order`.
4. Obtiene `paymentInfo` desde API MP.
5. Busca orden por `external_reference = order-<orderId>`.
6. Crea `payments` record si no existe.
7. Si pago aprobado:
   - actualiza `orders.status` a `paid`
   - guarda metodo de pago en `orderDetail.paymentMethod`
   - registra uso de promo code (si aplico)
   - encola emails de compra (cliente + admin)
8. Si pending/in_process: email pending.
9. Si rejected/cancelled: email rejected.

### 6.4 Como validar estado final en frontend

Consultar backend (no confiar solo en redirect):

- `GET /orders/:id`
- `GET /payments/my-payments`
- `GET /payments/status/:paymentId`

### 6.5 Endpoints de consulta pagos

| Metodo | URL | Acceso efectivo | Respuesta |
|---|---|---|---|
| GET | `/payments` | ADMIN+ | lista de pagos |
| GET | `/payments/my-payments` | Auth (cualquier rol) | pagos del usuario |
| GET | `/payments/status/:paymentId` | CLIENT+ | estado actual desde MP |
| GET | `/payments/order/:orderId` | ADMIN+ | pago de una orden |

---

## 7) Descuentos

### 7.1 Tipos soportados

- Descuento automatico por producto (`product_discounts`):
  - `discountType`: `percentage` o `fixed`
  - ventana de fechas y `isActive`.
- Promo code (`promo_codes`):
  - limites globales y por usuario
  - vigencia
  - monto minimo
  - alcance por productos o categorias

### 7.2 Regla de mayor descuento

Por item en checkout:

1. Calcula descuento admin (producto).
2. Calcula descuento de codigo.
3. Aplica el mayor.
4. Si empate, gana admin (`>=`).

Fuentes posibles:

- `ADMIN_PRODUCT`
- `CODE`

### 7.3 Campos para render de precios

En producto (`ResponseProductDto`):

- `originalPrice`
- `finalPrice`
- `hasActiveDiscount`
- `discountAmount`
- `discountPercentage`
- `discountEndDate`

En item de orden:

- `originalUnitPrice`
- `unitPrice` (final)
- `discountAmount`
- `discountSource`
- `discountCode`

### 7.4 Endpoints descuentos

#### Product discounts

| Metodo | URL | Acceso | Uso |
|---|---|---|---|
| POST | `/discounts/products` | ADMIN+ | crear |
| GET | `/discounts/products` | ADMIN+ | listar activos |
| GET | `/discounts/products/:productId` | PUBLIC | ver activo por producto |
| PUT | `/discounts/products/:id` | ADMIN+ | actualizar |
| DELETE | `/discounts/products/:id` | ADMIN+ | desactivar |

#### Promo codes

| Metodo | URL | Acceso | Uso |
|---|---|---|---|
| POST | `/discounts/promo-codes` | ADMIN+ | crear |
| GET | `/discounts/promo-codes` | ADMIN+ | listar |
| GET | `/discounts/promo-codes/:id` | ADMIN+ | detalle |
| PUT | `/discounts/promo-codes/:id` | ADMIN+ | actualizar |
| DELETE | `/discounts/promo-codes/:id` | ADMIN+ | desactivar |
| GET | `/discounts/promo-codes/:id/usage` | ADMIN+ | historial uso |
| POST | `/discounts/validate-code` | Auth (cualquier rol) | validar para carrito del usuario |

### 7.5 Errores frecuentes de promo code

- `Codigo promocional no encontrado`
- `ya no esta activo`
- `aun no esta vigente`
- `ha expirado`
- `alcanzado limite de usos`
- `maximo de usos por usuario`
- `monto minimo no alcanzado`
- `ningun producto/categoria elegible`

---

## 8) Newsletter

### 8.1 Endpoints publicos

| Metodo | URL | Body/Query | Respuesta |
|---|---|---|---|
| POST | `/newsletter/subscribe` | `{ email, name? }` | `{ message }` |
| GET | `/newsletter/unsubscribe` | `?token=...` | `{ message, email }` |
| GET | `/newsletter/track/open/:trackingId` | - | GIF 1x1 (`image/gif`) |
| GET | `/newsletter/track/click/:trackingId` | `?url=...` | redirect `302` |

### 8.2 Endpoints admin newsletter

| Metodo | URL | Uso | Respuesta |
|---|---|---|---|
| POST | `/newsletter/send-monthly-manual` | disparar mensual manual | `{ message }` |
| POST | `/newsletter/send-promo` | envio promo masivo | `{ message, enqueuedCount }` |
| GET | `/newsletter/stats` | estadisticas tracking | `{ total, sent, failed, opened, clicked }` |

### 8.3 Campaigns (admin)

Base: `/newsletter/campaigns`

| Metodo | URL | Uso |
|---|---|---|
| POST | `/newsletter/campaigns` | crear campania |
| GET | `/newsletter/campaigns` | listar (filtros status/campaignType) |
| GET | `/newsletter/campaigns/:id` | detalle |
| PATCH | `/newsletter/campaigns/:id` | editar |
| DELETE | `/newsletter/campaigns/:id` | soft delete |
| POST | `/newsletter/campaigns/:id/send` | encolar envio masivo |

**Campos de `CreateCampaignDto`:**

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | max 100 chars, nombre interno |
| `subject` | string | max 200 chars, asunto del email |
| `title` | string | max 200 chars, titulo visible |
| `body` | string | text, contenido HTML del email |
| `discountCode` | string? | max 50, codigo promo opcional |
| `featuredProductIds` | string[] | UUIDs de productos a destacar |
| `ctaText` | string | max 100, texto del boton CTA |
| `ctaUrl` | string | max 500, URL destino del boton |
| `campaignType` | string | `custom`, `monthly`, `promo`, `welcome` |
| `scheduledFor` | Date? | timestamp, fecha programada (opcional) |

`UpdateCampaignDto`: todos los campos son opcionales (Partial).

### 8.4 Tracking interno y colas

- Se crea `newsletter_tracking` por cada envio.
- Estados: `queued`, `sent`, `failed`, `opened`, `clicked`.
- Processor `newsletter` marca `sentAt/openedAt/clickedAt/errorMessage`.
- Cron mensual: `0 9 1 * *` (Argentina).

---

## 9) Reviews

### 9.1 Endpoints

| Metodo | URL | Acceso efectivo | Descripcion |
|---|---|---|---|
| POST | `/review` | CLIENT+ | crear review |
| GET | `/review` | ADMIN+ | listado paginado admin (incluye `isVisible`) |
| GET | `/review/:id` | CLIENT+ | detalle review |
| GET | `/review/product/:productId/public` | PUBLIC | reviews visibles |
| GET | `/review/can-review/:productId` | Auth (cualquier rol) | elegibilidad |
| GET | `/review/product/:productId` | ADMIN+ | reviews con `isVisible` |
| PATCH | `/review/:id/visibility` | ADMIN+ | toggle moderacion |
| DELETE | `/review/:id` | CLIENT+ | borrar review propia |

### 9.2 Body de creacion (`CreateReviewDto`)

| Campo | Tipo | Notas |
|---|---|---|
| `productId` | string | UUID del producto, requerido |
| `rating` | number | enum `1`, `2`, `3`, `4`, `5` (requerido) |
| `message` | string | texto libre, requerido |

### 9.3 Reglas reales

- Una review por usuario y producto:
  - validacion de servicio
  - constraint DB `@Unique(['user','product'])`.
- `can-review` solo verifica existencia de review previa.
- No valida compra previa del producto.
- Endpoint publico solo devuelve `isVisible=true`.

---

## 10) Otros Modulos Relevantes para Frontend

## 10.1 Users

| Metodo | URL | Acceso efectivo | Respuesta / efecto |
|---|---|---|---|
| GET | `/users` | ADMIN+ | paginado de usuarios |
| GET | `/users/:id` | Auth (cualquier rol) | detalle de usuario |
| PUT | `/users/update/user` | Auth (cualquier rol) | actualiza perfil propio (sin email) + email data-changed |
| PATCH | `/users/password` | Auth (cualquier rol) | cambia password + email confirmacion |
| DELETE | `/users/:id` | Auth (cualquier rol) | soft delete + email account deleted |
| PATCH | `/users/restore/:id` | ADMIN+ | restaura usuario soft-deleted |
| PATCH | `/users/roles/:id` | SUPER_ADMIN | cambia rol |
| POST | `/users/forgot-password` | PUBLIC | siempre responde mensaje generico + email reset si existe |
| POST | `/users/reset-password` | PUBLIC | resetea password con token + email confirmacion |
| GET | `/users/stats/me` | Auth (cualquier rol) | stats personales |
| GET | `/users/addresses/my-addresses` | CLIENT+ | lista direcciones (404 si no tiene) |
| POST | `/users/addresses/add` | Auth (cualquier rol) | crea direccion |
| PATCH | `/users/addresses/:addressId` | Auth (cualquier rol) | actualiza direccion |
| DELETE | `/users/addresses/:addressId` | Auth (cualquier rol) | elimina direccion |
| PATCH | `/users/addresses/:addressId/set-default` | Auth (cualquier rol) | set default |

## 10.2 Wishlist

| Metodo | URL | Acceso efectivo | Respuesta |
|---|---|---|---|
| GET | `/wishlist/my-wishlist` | CLIENT+ | `WishlistResponseDto` |
| GET | `/wishlist/summary` | CLIENT+ | `{ itemCount }` |
| POST | `/wishlist/add` | CLIENT+ | item agregado |
| DELETE | `/wishlist/remove/:productId` | CLIENT+ | `204` |
| DELETE | `/wishlist/clear` | CLIENT+ | `204` |
| GET | `/wishlist/check/:productId` | CLIENT+ | `{ isInWishlist }` |

## 10.3 Categories

| Metodo | URL | Acceso | Respuesta |
|---|---|---|---|
| GET | `/categories` | PUBLIC | paginado de categorias (incluye productos) |
| GET | `/categories/:id` | PUBLIC | categoria con productos |
| POST | `/categories` | ADMIN+ | crea categoria |
| POST | `/categories/seeder` | ADMIN+ | pre-carga categorias desde `PRODUCTS_SEED` |

## 10.4 Files (Cloudinary)

| Metodo | URL | Acceso | Body | Respuesta |
|---|---|---|---|---|
| POST | `/files/uploadImage/:id` | ADMIN+ | multipart `file` | `{ id, url }` |

Validaciones:

- mime permitido: jpg/jpeg/png/webp/gif (pipe y fileFilter).
- tam max 5MB.
- producto debe existir y estar activo.

## 10.5 Repairs (Reparaciones)

### Enums

```typescript
enum DeviceType {
  LAPTOP = 'laptop',
  DESKTOP = 'desktop',
  MONITOR = 'monitor',
  HARD_DRIVE = 'hard-drive',
  COMPONENT = 'component',
  OTHER = 'other',
}

enum RepairUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

enum RepairStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
```

### Endpoints

| Metodo | URL | Acceso | Body/Params | Respuesta |
|---|---|---|---|---|
| POST | `/repairs` | PUBLIC | `CreateRepairDto` | `{ message: string, repairId: string }` |
| GET | `/repairs` | ADMIN | query: `page`, `limit`, `status`, `urgency` | `{ total, pages, items: Repair[] }` |
| GET | `/repairs/:id` | ADMIN | param UUID | `Repair` |
| PATCH | `/repairs/:id/status` | ADMIN | `UpdateRepairStatusDto` | `Repair` |

### CreateRepairDto

| Campo | Tipo | Validacion |
|---|---|---|
| fullName | string | @IsNotEmpty, @Length(2, 80) |
| email | string | @IsNotEmpty, @IsEmail |
| phone | string | @IsNotEmpty, @Length(10, 20) |
| deviceType | DeviceType | @IsNotEmpty, @IsEnum |
| brand | string | @IsNotEmpty, @IsString |
| model | string | @IsNotEmpty, @IsString |
| issueDescription | string | @IsNotEmpty, @Length(10, 1000) |
| urgency | RepairUrgency | @IsNotEmpty, @IsEnum |

### UpdateRepairStatusDto

| Campo | Tipo | Validacion |
|---|---|---|
| status | RepairStatus | @IsNotEmpty, @IsEnum |
| adminNotes | string (opcional) | @IsOptional, @Length(0, 1000) |

### Reglas de negocio

- No se puede cambiar el estado de una reparacion que ya esta `completed` o `cancelled`.
- `POST /repairs` tiene rate limit de 3 requests por minuto.
- Al crear una reparacion se envian 2 emails: confirmacion al usuario y notificacion al admin.
- Al actualizar el estado se envia un email de actualizacion al usuario.

### Repair entity (respuesta JSON)

```json
{
  "id": "uuid",
  "fullName": "Juan Perez",
  "email": "juan@ejemplo.com",
  "phone": "+541112345678",
  "deviceType": "laptop",
  "brand": "MSI",
  "model": "GF63 Thin",
  "issueDescription": "La pantalla no enciende",
  "urgency": "medium",
  "status": "pending",
  "adminNotes": null,
  "createdAt": "2026-03-01T...",
  "updatedAt": "2026-03-01T..."
}
```

## 10.6 Contact

| Metodo | URL | Acceso | Body | Efecto |
|---|---|---|---|---|
| POST | `/contact` | PUBLIC | `{ name, email, phone, reason }` | encola email a usuario + email a admin |

## 10.7 Health

| Metodo | URL | Acceso | Respuesta |
|---|---|---|---|
| GET | `/health` | PUBLIC | objeto simple `{status,timestamp,uptime}` o respuesta Terminus DB check |

Nota: hay dos controladores registrados para `/health`.

## 10.8 Roles y Seeds

| Metodo | URL | Acceso | Uso |
|---|---|---|---|
| POST | `/roles/seed_roles` | SUPER_ADMIN | crear/actualizar roles base |

Seed bootstrap automatico en startup:

- `seedRoles`
- `seedSuperAdmin` (requiere `SUPER_ADMIN_PASSWORD`)

---

## 11) Control de Acceso (tabla global)

### 11.1 Convenciones

- `PUBLIC`: sin token.
- `CLIENT`: token + rol CLIENT (por jerarquia tambien ADMIN y SUPER_ADMIN).
- `ADMIN`: token + rol ADMIN (o SUPER_ADMIN).
- `SUPER_ADMIN`: solo SUPER_ADMIN.
- `AUTH`: token valido, sin restriccion de rol adicional.

### 11.2 Matriz

| Endpoint | PUBLIC | CLIENT | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `GET /health` | SI | SI | SI | SI |
| `POST /auth/singin/user` | SI | SI | SI | SI |
| `POST /auth/singup` | SI | SI | SI | SI |
| `GET /auth/google` | SI | SI | SI | SI |
| `GET /auth/google/callback` | SI | SI | SI | SI |
| `POST /auth/exchange-code` | SI | SI | SI | SI |
| `POST /auth/logout` | SI | SI | SI | SI |
| `GET /products` | SI | SI | SI | SI |
| `GET /products/featured` | SI | SI | SI | SI |
| `GET /products/brand/:brand` | SI | SI | SI | SI |
| `GET /products/category/:categoryId` | SI | SI | SI | SI |
| `GET /products/search/hybrid` | SI | SI | SI | SI |
| `GET /products/:id/related` | SI | SI | SI | SI |
| `GET /products/:id` | SI | SI | SI | SI |
| `GET /products/:id/price` | SI | SI | SI | SI |
| `GET /products/:id/stock` | SI | SI | SI | SI |
| `POST /products` | NO | NO | SI | SI |
| `PUT /products/:id` | NO | NO | SI | SI |
| `DELETE /products/:id` | NO | NO | SI | SI |
| `POST /products/:id/variants` | NO | NO | SI | SI |
| `PUT /products/variants/:variantId` | NO | NO | SI | SI |
| `DELETE /products/variants/:variantId` | NO | NO | SI | SI |
| `POST /products/seeder` | NO | NO | SI | SI |
| `GET /categories` | SI | SI | SI | SI |
| `GET /categories/:id` | SI | SI | SI | SI |
| `POST /categories` | NO | NO | SI | SI |
| `POST /categories/seeder` | NO | NO | SI | SI |
| `POST /contact` | SI | SI | SI | SI |
| `POST /repairs` | SI | SI | SI | SI |
| `GET /repairs` | NO | NO | SI | SI |
| `GET /repairs/:id` | NO | NO | SI | SI |
| `PATCH /repairs/:id/status` | NO | NO | SI | SI |
| `POST /newsletter/subscribe` | SI | SI | SI | SI |
| `GET /newsletter/unsubscribe` | SI | SI | SI | SI |
| `GET /newsletter/track/open/:trackingId` | SI | SI | SI | SI |
| `GET /newsletter/track/click/:trackingId` | SI | SI | SI | SI |
| `POST /newsletter/send-monthly-manual` | NO | NO | SI | SI |
| `POST /newsletter/send-promo` | NO | NO | SI | SI |
| `GET /newsletter/stats` | NO | NO | SI | SI |
| `POST /newsletter/campaigns` | NO | NO | SI | SI |
| `GET /newsletter/campaigns` | NO | NO | SI | SI |
| `GET /newsletter/campaigns/:id` | NO | NO | SI | SI |
| `PATCH /newsletter/campaigns/:id` | NO | NO | SI | SI |
| `DELETE /newsletter/campaigns/:id` | NO | NO | SI | SI |
| `POST /newsletter/campaigns/:id/send` | NO | NO | SI | SI |
| `GET /cart/my-cart` | NO | SI | SI | SI |
| `GET /cart/summary` | NO | SI | SI | SI |
| `POST /cart/preview-discounts` | NO | SI | SI | SI |
| `POST /cart/add` | NO | SI | SI | SI |
| `PUT /cart/items/:cartItemId` | NO | SI | SI | SI |
| `DELETE /cart/items/:cartItemId` | NO | SI | SI | SI |
| `DELETE /cart/clear` | NO | SI | SI | SI |
| `POST /cart/validate-stock` | NO | SI | SI | SI |
| `POST /cart/select-address` | NO | SI | SI | SI |
| `GET /cart/selected-address` | NO | SI | SI | SI |
| `POST /cart/checkout` | NO | SI | SI | SI |
| `GET /orders` | NO | NO | SI | SI |
| `GET /orders/my-orders` | NO | SI | SI | SI |
| `GET /orders/stats` | NO | NO | SI | SI |
| `GET /orders/:id` | NO | SI | SI | SI |
| `PUT /orders/:id/status` | NO | NO | SI | SI |
| `POST /orders/:id/cancel` | NO | SI | SI | SI |
| `POST /payments/create-preference` | NO | SI | SI | SI |
| `GET /payments` | NO | NO | SI | SI |
| `POST /payments/webhook` | SI | SI | SI | SI |
| `GET /payments/my-payments` | NO | SI | SI | SI |
| `GET /payments/status/:paymentId` | NO | SI | SI | SI |
| `GET /payments/order/:orderId` | NO | NO | SI | SI |
| `POST /discounts/products` | NO | NO | SI | SI |
| `GET /discounts/products` | NO | NO | SI | SI |
| `GET /discounts/products/:productId` | SI | SI | SI | SI |
| `PUT /discounts/products/:id` | NO | NO | SI | SI |
| `DELETE /discounts/products/:id` | NO | NO | SI | SI |
| `POST /discounts/promo-codes` | NO | NO | SI | SI |
| `GET /discounts/promo-codes` | NO | NO | SI | SI |
| `GET /discounts/promo-codes/:id` | NO | NO | SI | SI |
| `PUT /discounts/promo-codes/:id` | NO | NO | SI | SI |
| `DELETE /discounts/promo-codes/:id` | NO | NO | SI | SI |
| `GET /discounts/promo-codes/:id/usage` | NO | NO | SI | SI |
| `POST /discounts/validate-code` | NO | SI | SI | SI |
| `POST /review` | NO | SI | SI | SI |
| `GET /review` | NO | NO | SI | SI |
| `GET /review/:id` | NO | SI | SI | SI |
| `GET /review/product/:productId/public` | SI | SI | SI | SI |
| `GET /review/can-review/:productId` | NO | SI | SI | SI |
| `GET /review/product/:productId` | NO | NO | SI | SI |
| `PATCH /review/:id/visibility` | NO | NO | SI | SI |
| `DELETE /review/:id` | NO | SI | SI | SI |
| `GET /wishlist/my-wishlist` | NO | SI | SI | SI |
| `GET /wishlist/summary` | NO | SI | SI | SI |
| `POST /wishlist/add` | NO | SI | SI | SI |
| `DELETE /wishlist/remove/:productId` | NO | SI | SI | SI |
| `DELETE /wishlist/clear` | NO | SI | SI | SI |
| `GET /wishlist/check/:productId` | NO | SI | SI | SI |
| `GET /users` | NO | NO | SI | SI |
| `GET /users/:id` | NO | SI | SI | SI |
| `PUT /users/update/user` | NO | SI | SI | SI |
| `PATCH /users/password` | NO | SI | SI | SI |
| `DELETE /users/:id` | NO | SI | SI | SI |
| `PATCH /users/restore/:id` | NO | NO | SI | SI |
| `PATCH /users/roles/:id` | NO | NO | NO | SI |
| `POST /users/forgot-password` | SI | SI | SI | SI |
| `POST /users/reset-password` | SI | SI | SI | SI |
| `GET /users/stats/me` | NO | SI | SI | SI |
| `GET /users/addresses/my-addresses` | NO | SI | SI | SI |
| `POST /users/addresses/add` | NO | SI | SI | SI |
| `PATCH /users/addresses/:addressId` | NO | SI | SI | SI |
| `DELETE /users/addresses/:addressId` | NO | SI | SI | SI |
| `PATCH /users/addresses/:addressId/set-default` | NO | SI | SI | SI |
| `POST /files/uploadImage/:id` | NO | NO | SI | SI |
| `POST /roles/seed_roles` | NO | NO | NO | SI |

Si no tiene permiso:

- Sin token/invalid token -> `401`.
- Token valido pero rol insuficiente -> `403` con detalle de roles requeridos.

---

## 12) Manejo de Errores

### 12.1 Formato real

```json
{
  "statusCode": 400,
  "timestamp": "2026-03-01T18:10:00.000Z",
  "path": "/cart/checkout",
  "error": {
    "message": "Some products in the cart are not available",
    "issues": [
      {
        "itemId": "uuid",
        "productId": "uuid",
        "productName": "Mouse",
        "issue": "Insufficient stock",
        "requested": 3,
        "available": 1
      }
    ]
  }
}
```

### 12.2 Status codes frecuentes

- `400`: validacion de negocio, DTO invalido, stock, promo, transiciones invalidas.
- `401`: sin token o token vencido/invalido.
- `403`: rol insuficiente.
- `404`: recurso no encontrado.
- `409`: conflicto (ejemplo overlap de descuentos, username/email segun modulo).
- `429`: rate limit (throttler).
- `500`: errores internos no manejados.

### 12.3 Casos concretos a manejar en frontend

- `POST /cart/checkout`:
  - error puede traer `issues[]` para mostrar por item.
- `POST /discounts/validate-code`:
  - respuesta valida o invalida con `errors[]` (en exito de endpoint, no exception).
- `POST /payments/webhook`:
  - siempre responde `200` con `status` (`success`, `invalid_signature`, `invalid_structure`, `error`).
- Validacion DTO global:
  - `error.message` suele ser array de mensajes.

---

## 12.4 Rate Limiting por endpoint

El backend usa `ThrottlerGuard` global. Limite default: **60 req/min**.

Endpoints con limites personalizados:

| Endpoint | Limite |
|---|---|
| `POST /auth/singin/user` | 5 req/min |
| `POST /auth/singup` | 3 req/min |
| `POST /auth/exchange-code` | 10 req/min |
| `POST /cart/checkout` | 5 req/min |
| `POST /users/forgot-password` | 3 req/5min |
| `POST /users/reset-password` | 5 req/5min |
| `POST /contact` | 3 req/min |
| `POST /newsletter/subscribe` | 5 req/min |
| `GET /newsletter/unsubscribe` | 5 req/min |
| `GET /newsletter/track/open/:id` | 30 req/min |
| `GET /newsletter/track/click/:id` | 30 req/min |
| `GET /products` | 300 req/min |
| `GET /products/:id` | 300 req/min |
| `GET /products/search/hybrid` | 240 req/min |

Endpoints sin throttle (`@SkipThrottle`): `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/logout`, `POST /payments/webhook`.

Respuesta al exceder limite: `429 Too Many Requests`.

---

## 13) Estructuras de Respuesta Reales (JSON)

## 13.1 Producto (`ResponseProductDto`)

```json
{
  "id": "9cc0dc0f-5f5e-47e7-9bd2-9ad66f8a6f7d",
  "name": "Dell Inspiron 15 3520",
  "description": "Laptop ideal for work and study",
  "brand": "Dell",
  "model": "Inspiron 15 3520",
  "basePrice": 699.99,
  "baseStock": 10,
  "finalPrice": 629.99,
  "originalPrice": 699.99,
  "totalStock": 10,
  "category_name": "Laptops",
  "imgUrls": [
    "https://res.cloudinary.com/demo/image/upload/v1/p.jpg"
  ],
  "specifications": {
    "screenSize": "15.6\"",
    "resolution": "1920x1080"
  },
  "hasVariants": false,
  "isActive": true,
  "featured": true,
  "variants": [],
  "hasActiveDiscount": true,
  "discountAmount": 70,
  "discountPercentage": 10,
  "discountEndDate": "2026-06-01T00:00:00.000Z",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-01T12:00:00.000Z"
}
```

## 13.2 Orden (`ResponseOrderMapper.toDTO`)

```json
{
  "id": "58eab7d5-b684-4c56-b25d-7e9db3a8f2a2",
  "orderNumber": "ORD-2026-03-0001",
  "status": "pending",
  "createdAt": "2026-03-01T15:32:00.000Z",
  "updatedAt": "2026-03-01T15:32:00.000Z",
  "user": {
    "id": "4e5a24d5-75ef-42d2-a15a-17f0428f8bd9",
    "name": "Lucio",
    "email": "lucio@example.com"
  },
  "orderDetail": {
    "id": "7c18bfc5-fbc9-4b9f-a9cb-2d9ef9e8e9d8",
    "subtotal": 180,
    "tax": 37.8,
    "shipping": 10,
    "total": 227.8,
    "totalDiscount": 20,
    "promoCodeUsed": "NEWS30",
    "shippingAddress": {
      "id": "f5b86033-7273-496d-a8d2-0f06a95ccf23",
      "label": "Home",
      "street": "123 Main St",
      "city": "Buenos Aires",
      "province": "CABA",
      "postalCode": "1001",
      "country": "Argentina",
      "isDefault": true
    },
    "shippingAddressId": "f5b86033-7273-496d-a8d2-0f06a95ccf23",
    "paymentMethod": null,
    "items": [
      {
        "id": "2be03df9-520f-48ce-a7db-9f2d0e5b2e32",
        "quantity": 2,
        "unitPrice": 90,
        "subtotal": 180,
        "originalUnitPrice": 100,
        "discountAmount": 10,
        "discountSource": "CODE",
        "discountCode": "NEWS30",
        "productSnapshot": {
          "name": "Mouse",
          "description": "Gaming mouse",
          "basePrice": 100
        },
        "variantsSnapshot": null,
        "createdAt": "2026-03-01T15:32:00.000Z"
      }
    ]
  }
}
```

Nota: si la orden esta cancelada, la respuesta incluye ademas `"cancellationReason": "string"` a nivel raiz.

## 13.3 Usuario (`UserMapper.toResponse`)

```json
{
  "id": "4e5a24d5-75ef-42d2-a15a-17f0428f8bd9",
  "name": "Lucio",
  "email": "lucio@example.com",
  "birthDate": "1995-08-17",
  "phone": "5491112345678",
  "username": "lucio",
  "role": "CLIENT",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "deletedAt": null,
  "address": [
    {
      "id": "f5b86033-7273-496d-a8d2-0f06a95ccf23",
      "label": "Home",
      "street": "123 Main St",
      "city": "Buenos Aires",
      "province": "CABA",
      "postalCode": "1001",
      "country": "Argentina",
      "isDefault": true
    }
  ],
  "orders": [
    {
      "id": "58eab7d5-b684-4c56-b25d-7e9db3a8f2a2",
      "orderNumber": "ORD-2026-03-0001",
      "status": "pending"
    }
  ],
  "wishlistCount": 3,
  "cart": {
    "id": "7d9d16cf-baa2-48da-8b95-c0f655f8e6f1",
    "total": 299.99,
    "createdAt": "2026-03-01T10:10:00.000Z",
    "updatedAt": "2026-03-01T10:15:00.000Z",
    "items": [],
    "itemCount": 2
  }
}
```

## 13.4 Carrito (`mapCartToResponse`)

```json
{
  "id": "7d9d16cf-baa2-48da-8b95-c0f655f8e6f1",
  "total": 299.99,
  "createdAt": "2026-03-01T10:10:00.000Z",
  "updatedAt": "2026-03-01T10:15:00.000Z",
  "itemCount": 2,
  "items": [
    {
      "id": "8dd877ec-7212-4342-a227-1dd9b1f3e3c2",
      "quantity": 2,
      "priceAtAddition": 149.995,
      "subtotal": 299.99,
      "addedAt": "2026-03-01T10:12:00.000Z",
      "selectedVariants": [
        {
          "id": "var-1",
          "type": "color",
          "name": "Black",
          "priceModifier": 0
        }
      ],
      "variants": [
        {
          "id": "var-1",
          "type": "color",
          "name": "Black",
          "priceModifier": 0,
          "stock": 10,
          "isAvailable": true
        }
      ],
      "product": {
        "id": "prod-1",
        "name": "Mouse",
        "description": "Gaming mouse",
        "brand": "Logitech",
        "model": "G Pro",
        "basePrice": 149.995,
        "baseStock": 100,
        "imgUrls": [
          "https://..."
        ],
        "hasVariants": true,
        "isActive": true,
        "category": {
          "id": "cat-1",
          "category_name": "Mouses"
        }
      }
    }
  ]
}
```

## 13.5 Review publica (`toPublicResponse`)

```json
{
  "id": "f7b24cb8-40f7-4303-a6cf-6cc49ef4b4a1",
  "rating": 5,
  "message": "Excelente producto",
  "createdAt": "2026-03-01T13:00:00.000Z",
  "user": {
    "id": "4e5a24d5-75ef-42d2-a15a-17f0428f8bd9",
    "name": "Lucio"
  },
  "product": {
    "id": "prod-1",
    "name": "Mouse"
  }
}
```

## 13.6 Newsletter (respuestas reales)

Suscripcion:

```json
{
  "message": "Te has suscrito al newsletter exitosamente."
}
```

Stats:

```json
{
  "total": 1200,
  "sent": 1190,
  "failed": 10,
  "opened": 430,
  "clicked": 210
}
```

### 13.7 Error global (real)

```json
{
  "statusCode": 403,
  "timestamp": "2026-03-01T18:20:00.000Z",
  "path": "/discounts/products",
  "error": "Access restricted. This action requires one of the following roles: ADMIN. Your role: CLIENT"
}
```

---

## 14) Efectos Secundarios Importantes

| Endpoint / Proceso | Efectos secundarios reales |
|---|---|
| `POST /auth/singin/user` | encola email login notification |
| `POST /auth/singup` | crea usuario + encola welcome email |
| `POST /users/forgot-password` | guarda token hash + expiracion + encola reset email |
| `POST /users/reset-password` | cambia password + limpia token + encola confirm email |
| `PATCH /users/password` | cambia password + encola confirm email |
| `PUT /users/update/user` | actualiza perfil + encola data-changed email |
| `DELETE /users/:id` | soft delete usuario + encola account deleted email |
| `POST /cart/add` | crea/actualiza carrito e items |
| `PUT /cart/items/:id` | actualiza cantidad/recalcula totales |
| `DELETE /cart/items/:id` | elimina item/recalcula totales |
| `DELETE /cart/clear` | vacia carrito |
| `POST /cart/checkout` | agrega direccion usuario, crea orden, crea order items, aplica descuentos, descuenta stock, limpia carrito |
| `PUT /orders/:id/status` | cambia estado + encola emails segun nuevo estado (`processing`, `shipped`, `delivered`) |
| `POST /orders/:id/cancel` | cambia estado `cancelled`, restaura stock, encola email cancelacion, posible refund email |
| `POST /payments/webhook` | crea pago, actualiza estado orden, guarda paymentMethod, registra uso promo code, encola emails pagos |
| `POST /contact` | encola email confirmacion usuario + email admin |
| `POST /newsletter/subscribe` | crea/reactiva subscriber + crea tracking + encola welcome newsletter |
| `GET /newsletter/track/open/:id` | marca tracking `opened` |
| `GET /newsletter/track/click/:id` | marca tracking `clicked` + redirect |
| `POST /newsletter/send-monthly-manual` | encola envio mensual masivo |
| `POST /newsletter/send-promo` | valida promo code y encola promo masiva |
| `POST /newsletter/campaigns/:id/send` | crea tracking por subscriber + encola custom campaign |
| Cron `abandoned carts` | detecta carritos abandonados y encola email abandonado |
| Cron `monthly newsletter` | encola newsletter mensual |
| `POST /files/uploadImage/:id` | sube imagen a Cloudinary, guarda `files`, actualiza `product.imgUrls` |
| `POST /roles/seed_roles` | inserta/actualiza roles base |
| Seed bootstrap startup | ejecuta seeds en arranque (`roles`, `superadmin`) |

---

## 15) Observaciones Importantes para Frontend

1. Endpoints auth tienen typo en path:
   - `/auth/singin/user`
   - `/auth/singup`

2. Inconsistencia JWT/cookie en Google OAuth:
   - `exchange-code` devuelve `{ userId, success: true }` en body y setea `access_token` cookie con el JWT.
   - Los guards solo leen `Authorization: Bearer <token>`, no la cookie.
   - El frontend recibe el JWT unicamente como cookie HttpOnly (no accesible desde JS).
   - Para usar endpoints protegidos con OAuth, el frontend no tiene forma de obtener el Bearer token.
   - **Workaround**: Modificar el guard para leer tambien la cookie, o modificar `exchange-code` para devolver el token en el body.

3. `AuthsService` firma JWT sin `expiresIn` en `jwt.sign(payload)`, pero la respuesta de login dice `expiresIn: 3600`. El JWT resultante puede no tener claim `exp`, lo que significa que no expira server-side (depende de config global de `JwtModule`).

4. `POST /auth/logout` solo limpia cookie; no invalida token Bearer.

5. `DELETE /users/:id` y `GET /users/:id` requieren solo AuthGuard (no ownership/rol adicional).

6. `GET /payments/status/:paymentId` no verifica ownership de orden/pago; consulta estado por `paymentId`.

7. `POST /cart/checkout` siempre agrega una direccion nueva antes de crear orden.
   - Si habia `selectedAddressId` en carrito, puede usarse esa para snapshot.
   - Resultado posible: direcciones duplicadas en perfil.

8. En newsletter, URLs de baja en emails se construyen con `FRONTEND_URL` (`/newsletter/unsubscribe?token=...`).
   - Endpoint backend real es `GET /newsletter/unsubscribe`.
   - Frontend debe asegurarse de reenviar esa accion al backend.

9. Hay dos controladores para `GET /health` (respuesta simple y Terminus DB check) en el mismo path.

10. Webhook de pagos responde `200` incluso cuando firma o payload son invalidos (`status` en body).
    - No esperar errores HTTP para retry externo.

11. Algunas cadenas de texto/plantillas tienen caracteres con encoding inconsistente (`estÃ¡`, etc).
    - Considerar normalizacion de encoding si se muestran en UI.

12. `GET /products/:id/price` no aplica descuentos; solo base + variantes.
    - Para precio final con descuentos usar flujo carrito/checkout o `finalPrice` de producto.

---

## 16) Checklist de Integracion Frontend

1. Usar Bearer token para endpoints protegidos.
2. Manejar errores por shape global (`statusCode`, `error`, `path`).
3. No duplicar logica de descuentos en frontend:
   - usar `preview-discounts` para totales reales.
4. Tratar `orders.status` como fuente de verdad para estado de compra.
5. En pagos, validar estado final via backend (no solo URL de retorno MP).
6. Manejar SSE con `EventSource`, parsear `event.data`, y cerrar stream segun estrategia UI.
7. Mostrar correctamente `originalPrice/finalPrice` y campos de descuento.
8. Tratar endpoints que retornan `204` sin body (`wishlist remove/clear`).
