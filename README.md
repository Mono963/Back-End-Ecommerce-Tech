# 🛒 E-commerce Backend API

Backend completo de e-commerce construido con NestJS, TypeORM y PostgreSQL. Sistema robusto con
autenticación JWT, gestión de productos con variantes, carrito de compras, órdenes, reviews y
wishlist.

[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Scripts Disponibles](#-scripts-disponibles)
- [Seeding de Datos](#-seeding-de-datos)
- [API Documentation](#-api-documentation)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Módulos Principales](#-módulos-principales)
- [Autenticación y Autorización](#-autenticación-y-autorización)
- [Base de Datos](#-base-de-datos)
- [Docker](#-docker)
- [Testing](#-testing)
- [Ejemplos de Uso](#-ejemplos-de-uso)

---

## ✨ Características

### 🔐 Autenticación y Autorización

- **JWT Authentication** con tokens firmados
- **Google OAuth 2.0** para login social
- **Role-Based Access Control (RBAC)** con 3 niveles:
  - `SUPER_ADMIN`: Control total del sistema
  - `ADMIN`: Gestión de productos, órdenes y usuarios
  - `CLIENT`: Operaciones de compra (cart, orders, reviews)
- Guards personalizados con jerarquía de roles

### 🛍️ Gestión de Productos

- CRUD completo de productos
- **Sistema de variantes** (RAM, Storage, Color, Warranty, etc.)
- Cálculo dinámico de precios con variantes
- Gestión automática de stock
- Búsqueda avanzada (nombre, marca, precio, categoría)
- Productos destacados (featured)
- Productos relacionados
- Soft delete (desactivación sin borrado físico)

### 🛒 Carrito de Compras

- Agregar/actualizar/eliminar items
- Selección de variantes por item
- Cálculo automático de subtotales
- Selección de dirección de envío
- Resumen optimizado para navbar (count + total)

### 📦 Sistema de Órdenes

- Creación de órdenes desde carrito
- Estados de orden: `PENDING` → `PAID` → `PROCESSING` → `SHIPPED` → `DELIVERED`
- Cancelación con restauración de stock
- Snapshot de productos y precios al momento de compra
- Cálculo de impuestos (21% IVA)
- Envío dinámico (gratis >$250, $10 >$100, $20 default)
- Historial de órdenes por usuario
- Filtros avanzados para admins (estado, fechas, número de orden, email)
- Estadísticas de revenue y conversión

### ⭐ Reviews y Ratings

- Sistema de calificaciones (1-5 estrellas)
- Una review por usuario por producto
- CRUD completo con validaciones

### ❤️ Wishlist

- Lista de deseos por usuario
- Agregar/eliminar productos
- Resumen optimizado (count)

### 👥 Gestión de Usuarios

- CRUD completo de usuarios
- Gestión de direcciones múltiples
- Cambio de contraseña seguro
- Cambio de roles (solo SUPER_ADMIN)
- Soft delete con restauración
- Paginación de listados

### 📂 Categorías

- CRUD de categorías de productos
- Productos agrupados por categoría

### 🖼️ Gestión de Archivos

- Upload de imágenes a **Cloudinary**
- Gestión de imágenes por producto
- Validación de tipo y tamaño

### 📧 Sistema de Emails

- Envío de emails con **Nodemailer**
- Templates con **Handlebars**
- CSS inlining con **Juice**

### 🔒 Seguridad

- **Helmet** para headers de seguridad
- **CORS** configurado
- **Rate Limiting** (Throttler)
- **Validation Pipes** con whitelist
- **Bcrypt** para hash de passwords
- Parámetros preparados (sin SQL injection)

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Framework**: NestJS 11.x
- **Lenguaje**: TypeScript 5.8
- **ORM**: TypeORM 0.3.25
- **Base de Datos**: PostgreSQL
- **Autenticación**: Passport.js + JWT + Google OAuth
- **Validación**: class-validator + class-transformer
- **Storage**: Cloudinary
- **Email**: Nodemailer + Handlebars
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest
- **Linting**: ESLint + Prettier
- **Containerización**: Docker + Docker Compose

### Patrones de Diseño

- **Módulos por dominio** (feature modules)
- **Repository Pattern** via TypeORM
- **DTO Pattern** para validación
- **Dependency Injection**
- **Guards para autorización**
- **Interceptors para transformación**
- **Pipes para validación**
- **Exception Filters** para manejo de errores

---

## 📦 Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14.x
- **Docker** (opcional, para containerización)
- Cuentas en servicios externos:
  - Google Cloud Console (OAuth)
  - Cloudinary (imágenes)
  - SMTP server (emails)

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd Back-end-ecommerce
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env.development

# Editar .env.development con tus credenciales
```

### 4. Crear base de datos PostgreSQL

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE ecommerce;

# Salir
\q
```

### 5. Ejecutar la aplicación

```bash
# Modo desarrollo (con hot-reload)
npm run start:dev

# Modo producción
npm run build
npm start
```

La aplicación estará disponible en:

- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs

---

## ⚙️ Configuración

### Variables de Entorno (.env.development)

```env
# ===========================
# Autenticación y Seguridad
# ===========================
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
FRONTEND_CLOUD_URL=http://localhost:3000
SUPABASE_JWT_SECRET=tu-secreto-jwt-super-seguro-minimo-32-caracteres

# ===========================
# Base de Datos (PostgreSQL)
# ===========================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USERNAME=postgres
DB_PASSWORD=tu-password-de-postgres
PORT=3001

# ===========================
# Cloudinary (Imágenes)
# ===========================
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# ===========================
# Email (SMTP)
# ===========================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password-de-gmail
EMAIL_SECURE=false
EMAIL_FROM="Tu App <tu-email@gmail.com>"

# ===========================
# Entorno
# ===========================
NODE_ENV=development
```

### Obtener Credenciales

#### Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Authorized redirect URIs: `http://localhost:3001/auth/google/callback`

#### Cloudinary

1. Registrarse en [Cloudinary](https://cloudinary.com/)
2. Dashboard → Account Details
3. Copiar Cloud Name, API Key, API Secret

#### Gmail SMTP (App Password)

1. Habilitar 2FA en tu cuenta de Google
2. Google Account → Security → 2-Step Verification → App passwords
3. Generar contraseña para "Mail"

---

## 📜 Scripts Disponibles

### Desarrollo

```bash
npm run start:dev          # Modo desarrollo con hot-reload
npm run start:debug        # Modo debug
npm start                  # Modo producción (requiere build)
```

### Build

```bash
npm run build              # Compilar TypeScript
npm run build:prod         # Build optimizado con webpack
```

### Code Quality

```bash
npm run lint               # Verificar errores de ESLint
npm run lint:fix           # Corregir errores automáticamente
npm run format             # Formatear código con Prettier
npm run format:check       # Verificar formato
npm run typecheck          # Verificar tipos de TypeScript
npm run code:check         # Lint + format check
npm run code:fix           # Lint fix + format
```

### Testing

```bash
npm test                   # Ejecutar tests unitarios
npm run test:watch         # Tests en modo watch
npm run test:cov           # Tests con coverage
npm run test:e2e           # Tests end-to-end
npm run test:debug         # Debug de tests
```

### Base de Datos

```bash
npm run migration:generate # Generar migración desde cambios en entities
npm run migration:create   # Crear migración vacía
npm run migration:run      # Ejecutar migraciones pendientes
npm run migration:revert   # Revertir última migración
npm run migration:show     # Ver estado de migraciones
```

### Pre-deploy

```bash
npm run pre-deploy         # code:check + test + build
```

---

## 🌱 Seeding de Datos

### 1. Seed de Roles (Automático al iniciar)

Los roles `CLIENT`, `ADMIN`, `SUPER_ADMIN` se crean automáticamente al iniciar la aplicación.

### 2. Seed de Categorías

Crear categorías manualmente vía API o directamente en la base de datos:

```bash
# Ejemplo: POST /categories
{
  "name": "Laptops",
  "description": "Computadoras portátiles"
}
```

Categorías sugeridas:

- Laptops
- Mouses
- Teclados
- Monitores
- Accesorios

### 3. Seed de Productos

El proyecto incluye datos de seed en `src/seeds/products.data.ts` con 10+ productos.

**Endpoint:** `GET /products/seed` (requiere autenticación ADMIN)

```bash
# 1. Crear cuenta de admin (o usar Google OAuth)
POST /auth/signup
{
  "email": "admin@test.com",
  "password": "Admin123!",
  "name": "Admin User"
}

# 2. Cambiar rol a ADMIN (desde DB o endpoint de SUPER_ADMIN)
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';

# 3. Login
POST /auth/signin/user
{
  "email": "admin@test.com",
  "password": "Admin123!"
}

# 4. Ejecutar seed (con token de admin)
GET /products/seed
Authorization: Bearer <token>
```

Productos incluidos en seed:

- Dell XPS 15 (con variantes de RAM y Storage)
- HP Pavilion Gaming
- MSI Katana GF66
- Logitech MX Master 3
- Corsair Dark Core RGB
- Y más...

---

## 📚 API Documentation

### Swagger UI

Documentación interactiva disponible en: **http://localhost:3001/api/docs**

### Endpoints Principales

#### Autenticación

```
POST   /auth/signup              - Registro de usuario
POST   /auth/signin/user         - Login con email/password
GET    /auth/google              - Iniciar OAuth con Google
GET    /auth/google/callback     - Callback de Google OAuth
```

#### Usuarios

```
GET    /users                    - Listar usuarios (ADMIN)
GET    /users/:id                - Obtener usuario por ID
PUT    /users/update/user        - Actualizar perfil propio
PATCH  /users/password           - Cambiar contraseña
PATCH  /users/roles/:id          - Cambiar rol (SUPER_ADMIN)
DELETE /users/:id                - Eliminar usuario (soft delete)
PATCH  /users/restore/:id        - Restaurar usuario
POST   /users/addresses          - Agregar dirección
GET    /users/:id/addresses      - Listar direcciones
PUT    /users/addresses/:id      - Actualizar dirección
DELETE /users/addresses/:id      - Eliminar dirección
```

#### Productos

```
GET    /products                 - Listar productos (paginado, búsqueda)
GET    /products/featured        - Productos destacados
GET    /products/:id             - Obtener producto por ID
POST   /products                 - Crear producto (ADMIN)
PUT    /products/:id             - Actualizar producto (ADMIN)
DELETE /products/:id             - Eliminar producto (ADMIN)
PATCH  /products/:id/restore     - Restaurar producto (ADMIN)
POST   /products/:id/variants    - Agregar variante (ADMIN)
PUT    /products/:variantId      - Actualizar variante (ADMIN)
GET    /products/seed            - Precargar datos (ADMIN)
```

#### Carrito

```
GET    /cart/id                  - Obtener mi carrito
GET    /cart/summary             - Resumen (count + total)
POST   /cart/add                 - Agregar item
PUT    /cart/items/:itemId       - Actualizar cantidad
DELETE /cart/items/:itemId       - Eliminar item
DELETE /cart                     - Vaciar carrito
PUT    /cart/address             - Seleccionar dirección de envío
```

#### Órdenes

```
GET    /orders                   - Listar órdenes (ADMIN, con filtros)
GET    /orders/my-orders         - Mis órdenes
GET    /orders/:id               - Obtener orden por ID
POST   /orders/from-cart         - Crear orden desde carrito
PUT    /orders/:id/status        - Actualizar estado (ADMIN)
PUT    /orders/:id/payment       - Confirmar pago
GET    /orders/stats             - Estadísticas de revenue (ADMIN)
```

#### Reviews

```
POST   /review                   - Crear review
GET    /review                   - Listar reviews (ADMIN)
GET    /review/:productId        - Reviews de un producto
PUT    /review/:id               - Actualizar review
DELETE /review/:id               - Eliminar review
```

#### Wishlist

```
GET    /wishlist/my-wishlist     - Obtener mi wishlist
GET    /wishlist/summary         - Resumen (count)
POST   /wishlist/add             - Agregar producto
DELETE /wishlist/remove/:productId - Eliminar producto
```

#### Categorías

```
GET    /categories               - Listar categorías
POST   /categories               - Crear categoría (ADMIN)
PUT    /categories/:id           - Actualizar categoría (ADMIN)
DELETE /categories/:id           - Eliminar categoría (ADMIN)
```

#### Health Check

```
GET    /health                   - Estado del servidor
```

---

## 📁 Estructura del Proyecto

```
src/
├── app.module.ts                 # Módulo raíz
├── app.controller.ts             # Health check
├── main.ts                       # Bootstrap de la aplicación
│
├── common/                       # Utilidades compartidas
│   ├── auths/                   # Interfaces de autenticación
│   ├── filters/                 # Exception filters
│   ├── pagination/              # Utilidades de paginación
│   └── pipes/                   # Validation pipes
│
├── config/                       # Configuraciones
│   ├── typeorm.ts               # Configuración de base de datos
│   ├── google-0auth.config.ts   # Google OAuth
│   ├── throttler.config.ts      # Rate limiting
│   └── cloudinary.ts            # Cloudinary
│
├── decorator/                    # Decoradores personalizados
│   └── role.decorator.ts        # @Roles()
│
├── guards/                       # Guards de autorización
│   ├── auth.guards.ts           # JWT authentication
│   └── auth.guards.role.ts      # Role-based authorization
│
├── interceptors/                 # Interceptores
│   └── date-adder.interceptor.ts
│
├── middlewares/                  # Middlewares
│   └── registerDate.middleware.ts
│
├── modules/                      # Módulos de negocio
│   ├── auths/                   # Autenticación
│   │   ├── auths.controller.ts
│   │   ├── auths.service.ts
│   │   ├── auths.module.ts
│   │   ├── strategies/          # Passport strategies
│   │   ├── interface/
│   │   └── validate/
│   │
│   ├── users/                   # Usuarios
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── entities/
│   │   ├── Dtos/
│   │   └── interface/
│   │
│   ├── products/                # Productos
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── products.module.ts
│   │   ├── entities/
│   │   │   ├── products.entity.ts
│   │   │   └── products_variant.entity.ts
│   │   ├── Dto/
│   │   └── interface/
│   │
│   ├── orders/                  # Órdenes
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   ├── orders.module.ts
│   │   ├── entities/
│   │   │   ├── order.entity.ts
│   │   │   ├── orderDetails.entity.ts
│   │   │   └── order.item.ts
│   │   ├── Dto/
│   │   └── interfaces/
│   │
│   ├── cart/                    # Carrito
│   │   ├── cart.controller.ts
│   │   ├── cart.service.ts
│   │   ├── cart.module.ts
│   │   ├── entities/
│   │   │   ├── cart.entity.ts
│   │   │   └── cart.item.entity.ts
│   │   ├── dto/
│   │   └── interfaces/
│   │
│   ├── category/                # Categorías
│   ├── review/                  # Reviews
│   ├── wishlist/                # Wishlist
│   ├── file/                    # Gestión de archivos
│   ├── mail/                    # Sistema de emails
│   │   ├── mail.service.ts
│   │   └── templates/           # Templates Handlebars
│   │
│   └── roles/                   # Roles RBAC
│
└── seeds/                        # Datos de seed
    ├── products.data.ts
    ├── role.seed.ts
    └── seedUser/
```

---

## 🔐 Autenticación y Autorización

### JWT Payload

```typescript
{
  sub: string;           // User ID
  email: string;
  name: string;
  username?: string;
  role: string;          // SUPER_ADMIN | ADMIN | CLIENT
  permissions: Record<string, string[]>;
  exp: number;           // Expiración
  iat: number;           // Issued at
}
```

### Jerarquía de Roles

```
SUPER_ADMIN (acceso total)
    ↓
ADMIN (gestión de productos, órdenes, usuarios)
    ↓
CLIENT (operaciones de compra)
```

### Uso en Controllers

```typescript
import { Roles } from '@/decorator/role.decorator';
import { AuthGuard } from '@/guards/auth.guards';
import { RoleGuard } from '@/guards/auth.guards.role';

@Controller('products')
@UseGuards(AuthGuard, RoleGuard)
export class ProductsController {
  @Get()
  @SkipThrottle()
  getProducts() {
    // Público (sin @Roles)
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createProduct() {
    // Solo ADMIN y SUPER_ADMIN
  }
}
```

### Ejemplo de Login

```bash
# 1. Registro
POST http://localhost:3001/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "name": "John Doe",
  "phone": "1234567890"
}

# 2. Login
POST http://localhost:3001/auth/signin/user
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}

# Respuesta:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CLIENT"
  }
}

# 3. Usar token en requests
GET http://localhost:3001/cart/id
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🗄️ Base de Datos

### Entities Principales

```typescript
Users → Cart (1:1)
     → Orders (1:M)
     → Reviews (1:M)
     → Wishlist (1:1)
     ← Role (M:1)

Product → ProductVariant (1:M)
        → Files (1:M)
        ← Category (M:1)
        → Reviews (1:M)

Order → OrderDetails (1:1)
      ← User (M:1)

OrderDetails → OrderItems (1:M)

OrderItem ← Product (M:1)
          ↔ ProductVariants (M:M)

Cart → CartItems (1:M)
     ← User (M:1)

CartItem ← Product (M:1)
         ↔ ProductVariants (M:M)
```

### Migraciones

```bash
# Generar migración automática desde cambios en entities
npm run migration:generate -- -n NombreMigracion

# Crear migración vacía
npm run migration:create -- -n NombreMigracion

# Ejecutar migraciones
npm run migration:run

# Revertir última migración
npm run migration:revert

# Ver estado
npm run migration:show
```

### Soft Deletes

Los siguientes entities usan soft delete (no se borran físicamente):

- `Product` (campo `isActive`)
- `User` (campo `deletedAt`)

---

## 🐳 Docker

### Docker Compose (Desarrollo)

```bash
# Iniciar contenedores
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Rebuild
docker-compose up --build
```

### Dockerfile (Producción)

```bash
# Build imagen
docker build -t ecommerce-backend .

# Run contenedor
docker run -p 3001:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  ecommerce-backend
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E
npm run test:e2e
```

### Estructura de Tests (Pendiente de implementar)

```
src/modules/auths/
  ├── auths.service.spec.ts
  ├── auths.controller.spec.ts

src/modules/products/
  ├── products.service.spec.ts
  ├── products.controller.spec.ts

test/
  ├── auth.e2e-spec.ts
  ├── products.e2e-spec.ts
```

---

## 💡 Ejemplos de Uso

### Flujo Completo de Compra

```typescript
// 1. Registro de usuario
POST /auth/signup
{
  "email": "cliente@test.com",
  "password": "Cliente123!",
  "confirmPassword": "Cliente123!",
  "name": "Juan Pérez",
  "phone": "1122334455"
}

// 2. Login
POST /auth/signin/user
{
  "email": "cliente@test.com",
  "password": "Cliente123!"
}
// → Guardar token: "eyJhbGciOiJIUz..."

// 3. Buscar productos
GET /products?name=laptop&page=1&limit=10

// 4. Ver producto específico
GET /products/{productId}

// 5. Agregar al carrito (con variantes)
POST /cart/add
Authorization: Bearer {token}
{
  "productId": "uuid-producto",
  "quantity": 1,
  "variantIds": ["uuid-variant-ram-16gb", "uuid-variant-storage-512gb"]
}

// 6. Ver carrito
GET /cart/id
Authorization: Bearer {token}

// 7. Agregar dirección de envío
POST /users/addresses
Authorization: Bearer {token}
{
  "label": "Casa",
  "street": "Av. Corrientes 1234",
  "city": "CABA",
  "province": "Buenos Aires",
  "postalCode": "C1043",
  "country": "Argentina",
  "isDefault": true
}

// 8. Seleccionar dirección en carrito
PUT /cart/address
Authorization: Bearer {token}
{
  "addressId": "uuid-direccion"
}

// 9. Crear orden desde carrito
POST /orders/from-cart
Authorization: Bearer {token}
{
  "shippingAddress": null  // Usa la dirección seleccionada en el carrito
}

// 10. Ver orden creada
GET /orders/{orderId}
Authorization: Bearer {token}

// 11. Admin: Confirmar pago
PUT /orders/{orderId}/payment
Authorization: Bearer {admin-token}
{
  "paymentMethod": "credit_card"
}

// 12. Admin: Cambiar estado a PROCESSING
PUT /orders/{orderId}/status
Authorization: Bearer {admin-token}
{
  "status": "PROCESSING"
}

// 13. Cliente: Dejar review
POST /review
Authorization: Bearer {token}
{
  "productId": "uuid-producto",
  "rating": 5,
  "message": "Excelente producto, muy recomendado!"
}
```

### Búsqueda Avanzada de Productos

```typescript
// Búsqueda por nombre
GET /products?name=dell&page=1&limit=10

// Búsqueda por marca
GET /products?brand=hp

// Búsqueda por rango de precio (±10%)
GET /products?price=1000

// Productos destacados
GET /products?featured=true

// Combinación de filtros
GET /products?name=laptop&brand=dell&featured=true&price=1500&page=1&limit=20
```

### Gestión de Wishlist

```typescript
// Agregar a wishlist
POST /wishlist/add
Authorization: Bearer {token}
{
  "productId": "uuid-producto"
}

// Ver wishlist completa
GET /wishlist/my-wishlist
Authorization: Bearer {token}

// Ver solo el contador
GET /wishlist/summary
Authorization: Bearer {token}

// Eliminar de wishlist
DELETE /wishlist/remove/{productId}
Authorization: Bearer {token}
```

---

## 📝 Notas de Desarrollo

### ⚠️ Importante

- **Este proyecto está en fase de DESARROLLO**
- `synchronize: true` está habilitado para auto-sincronización de schema
- En PRODUCCIÓN se debe usar `synchronize: false` + migraciones
- Rate limiting configurado en 10 req/min (ajustar para producción)

### 🔧 Configuraciones de Desarrollo

- Hot-reload habilitado con `start:dev`
- Logging de queries habilitado en desarrollo
- Swagger disponible en desarrollo
- CORS permisivo para localhost

### 📊 Próximas Implementaciones

- [ ] Tests unitarios y E2E
- [ ] Integración de pagos (Mercadopago)
- [ ] Sistema de cupones/descuentos
- [ ] Notificaciones por email
- [ ] Refresh tokens
- [ ] 2FA para administradores
- [ ] Audit logs
- [ ] Cache con Redis

---

## 🤝 Contribuciones

Este proyecto está en desarrollo activo. Sugerencias y mejoras son bienvenidas.

---

## 📄 Licencia

Este proyecto es privado y está en desarrollo.

---

## 📞 Contacto

Para consultas sobre el proyecto, contactar al equipo de desarrollo.

---

**Desarrollado con ❤️ usando NestJS**
