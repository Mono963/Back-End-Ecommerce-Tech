# 📘 DOCUMENTACIÓN COMPLETA DEL API - BACKEND E-COMMERCE

> **Documentación exhaustiva para desarrolladores frontend**
> Esta guía contiene TODA la información necesaria para integrar el frontend con el backend de e-commerce.

---

## 📋 TABLA DE CONTENIDOS

1. [Información General](#1-información-general)
2. [Configuración Inicial](#2-configuración-inicial)
3. [Autenticación y Autorización](#3-autenticación-y-autorización)
4. [Módulo de Usuarios](#4-módulo-de-usuarios)
5. [Módulo de Productos](#5-módulo-de-productos)
6. [Módulo de Carrito](#6-módulo-de-carrito)
7. [Módulo de Órdenes](#7-módulo-de-órdenes)
8. [Módulo de Reviews](#8-módulo-de-reviews)
9. [Módulo de Wishlist](#9-módulo-de-wishlist)
10. [Módulo de Categorías](#10-módulo-de-categorías)
11. [Módulo de Roles](#11-módulo-de-roles)
12. [Módulo de Archivos](#12-módulo-de-archivos)
13. [Manejo de Errores](#13-manejo-de-errores)
14. [Tipos TypeScript](#14-tipos-typescript)
15. [Ejemplos de Integración](#15-ejemplos-de-integración)
16. [Flujos Completos](#16-flujos-completos)
17. [Best Practices](#17-best-practices)

---

## 1. INFORMACIÓN GENERAL

### 1.1 URLs del Backend

```typescript
// Desarrollo
const API_BASE_URL = 'http://localhost:3001';
const SWAGGER_DOCS = 'http://localhost:3001/api/docs';

// Producción (ajustar según deploy)
const API_BASE_URL_PROD = 'https://tu-api.com';
```

### 1.2 Stack Tecnológico Backend

- **Framework**: NestJS 11.x
- **Base de Datos**: PostgreSQL
- **ORM**: TypeORM 0.3.25
- **Autenticación**: JWT + Google OAuth 2.0
- **Storage**: Cloudinary (imágenes)
- **Email**: Nodemailer + Gmail SMTP
- **Documentación**: Swagger/OpenAPI

### 1.3 Headers Requeridos

```typescript
// Para requests autenticados
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// Para uploads de archivos
const headersMultipart = {
  'Authorization': `Bearer ${token}`
  // NO incluir Content-Type, el browser lo setea automáticamente
};
```

### 1.4 Rate Limiting

- **Límite global**: 10 requests por minuto
- **Login**: 5 requests por minuto
- **Registro**: 3 requests por minuto

**Excepción**: Algunos endpoints públicos tienen `@SkipThrottle()`.

### 1.5 CORS

Origins permitidos:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://localhost:5173`

Credentials: `true` (necesario para cookies)

---

## 2. CONFIGURACIÓN INICIAL

### 2.1 Instalación de Dependencias (Frontend)

```bash
# Axios para HTTP requests
npm install axios

# (Opcional) React Query para caching
npm install @tanstack/react-query

# (Opcional) Zustand para state management
npm install zustand
```

### 2.2 Cliente Axios Base

```typescript
// src/api/axios.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Para cookies
});

// Interceptor para agregar token automáticamente
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejo de errores
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2.3 Variables de Entorno (.env)

```env
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=tu-google-client-id
```

---

## 3. AUTENTICACIÓN Y AUTORIZACIÓN

### 3.1 Endpoints de Autenticación

#### POST `/auth/signup` - Registro de Usuario

**Request Body:**
```typescript
interface SignupRequest {
  name: string;              // 3-80 caracteres
  email: string;             // Email válido, único
  birthDate: string;         // Formato: YYYY-MM-DD
  phone: string;             // Formato E.164: +1234567890
  username: string;          // 3-80 caracteres, único
  password: string;          // 8-15 caracteres, ver validación abajo
  confirmPassword: string;   // Debe coincidir con password
  address?: string;          // Opcional, texto libre
}

// Validación de password:
// - Mínimo 8 caracteres, máximo 15
// - Al menos 1 mayúscula
// - Al menos 1 minúscula
// - Al menos 1 número
// - Al menos 1 carácter especial (!@#$%^&*)
```

**Response (201):**
```typescript
interface SignupResponse {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  birthDate: string;
  role: 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN';
  addresses: UserAddress[];
  createdAt: string;
  updatedAt: string;
}
```

**Ejemplo:**
```typescript
const signup = async (data: SignupRequest) => {
  const response = await axiosInstance.post('/auth/signup', data);
  return response.data;
};

// Uso
try {
  const user = await signup({
    name: 'Juan Pérez',
    email: 'juan@example.com',
    birthDate: '1990-05-15',
    phone: '+541122334455',
    username: 'juan87',
    password: 'Juan1234!',
    confirmPassword: 'Juan1234!',
    address: 'Calle Falsa 123'
  });
  console.log('Usuario creado:', user);
} catch (error) {
  console.error('Error:', error.response?.data);
}
```

---

#### POST `/auth/signin/user` - Login

**Request Body:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response (200):**
```typescript
interface LoginResponse {
  accessToken: string;    // JWT token - GUARDAR
  expiresIn: number;      // Segundos (default: 3600)
  user: {
    id: string;
    name: string;
    email: string;
    role: 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN';
    username: string;
    phone: string;
    birthDate: string;
  };
}
```

**Ejemplo:**
```typescript
const login = async (credentials: LoginRequest) => {
  const response = await axiosInstance.post('/auth/signin/user', credentials);

  // IMPORTANTE: Guardar token en localStorage o estado
  const { accessToken, user } = response.data;
  localStorage.setItem('auth_token', accessToken);
  localStorage.setItem('user_data', JSON.stringify(user));

  return response.data;
};
```

**Rate Limit:** 5 requests / minuto

---

#### GET `/auth/google` - Login con Google OAuth

**Flujo:**

1. **Frontend redirige al usuario:**
```typescript
const loginWithGoogle = () => {
  window.location.href = 'http://localhost:3001/auth/google';
};
```

2. **Usuario autoriza en Google**

3. **Google redirige a:** `http://localhost:3001/auth/google/callback`

4. **Backend redirige a frontend con token:**
```
http://localhost:3000/auth/callback?token={JWT_TOKEN}&userId={USER_ID}
```

5. **Frontend captura el token:**
```typescript
// En página /auth/callback
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const userId = params.get('userId');

  if (token && userId) {
    localStorage.setItem('auth_token', token);
    // Opcionalmente, hacer GET /users/{userId} para obtener datos completos
    navigate('/dashboard');
  } else {
    navigate('/login?error=auth_failed');
  }
}, []);
```

---

### 3.2 Estructura del JWT Token

**Payload decodificado:**
```typescript
interface JwtPayload {
  sub: string;                          // User ID
  email: string;
  name: string;
  username?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLIENT';
  permissions: Record<string, string[]>;
  exp: number;                          // Timestamp de expiración
  iat: number;                          // Timestamp de emisión
}
```

**Decodificar token (frontend):**
```typescript
import jwtDecode from 'jwt-decode';

const token = localStorage.getItem('auth_token');
if (token) {
  const payload = jwtDecode<JwtPayload>(token);
  console.log('User role:', payload.role);
  console.log('Expires at:', new Date(payload.exp * 1000));
}
```

---

### 3.3 Sistema de Roles

**Jerarquía:**
```
SUPER_ADMIN > ADMIN > CLIENT
```

**Permisos por rol:**

| Acción | CLIENT | ADMIN | SUPER_ADMIN |
|--------|--------|-------|-------------|
| Ver productos | ✅ | ✅ | ✅ |
| Crear productos | ❌ | ✅ | ✅ |
| Gestionar carrito | ✅ | ✅ | ✅ |
| Crear órdenes | ✅ | ✅ | ✅ |
| Ver todas las órdenes | ❌ | ✅ | ✅ |
| Actualizar estado de orden | ❌ | ✅ | ✅ |
| Cancelar orden | ❌ | ❌ | ✅ |
| Ver usuarios | ❌ | ✅ | ✅ |
| Cambiar roles | ❌ | ❌ | ✅ |
| Crear reviews | ✅ | ✅ | ✅ |
| Gestionar wishlist | ✅ | ✅ | ✅ |

**Proteger rutas en frontend:**
```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN';
}

export const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);

    // Verificar expiración
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('auth_token');
      return <Navigate to="/login" />;
    }

    // Verificar rol si es necesario
    if (requiredRole) {
      const roleHierarchy = {
        'CLIENT': 1,
        'ADMIN': 2,
        'SUPER_ADMIN': 3
      };

      if (roleHierarchy[payload.role] < roleHierarchy[requiredRole]) {
        return <Navigate to="/unauthorized" />;
      }
    }

    return <>{children}</>;
  } catch (error) {
    localStorage.removeItem('auth_token');
    return <Navigate to="/login" />;
  }
};

// Uso en rutas
<Route path="/admin" element={
  <ProtectedRoute requiredRole="ADMIN">
    <AdminDashboard />
  </ProtectedRoute>
} />
```

---

## 4. MÓDULO DE USUARIOS

### 4.1 GET `/users` - Listar Usuarios (ADMIN)

**Query Params:**
```typescript
interface UserSearchQuery {
  page?: number;        // Default: 1
  limit?: number;       // Default: 10
  username?: string;    // Búsqueda parcial
  email?: string;       // Búsqueda parcial
}
```

**Response:**
```typescript
interface PaginatedUsersResponse {
  items: User[];
  total: number;
  pages: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  birthDate: string;
  role: string;
  addresses: UserAddress[];
  createdAt: string;
  updatedAt: string;
}
```

**Ejemplo:**
```typescript
const getUsers = async (params: UserSearchQuery) => {
  const response = await axiosInstance.get('/users', { params });
  return response.data;
};

// Uso
const users = await getUsers({ page: 1, limit: 20, username: 'juan' });
```

---

### 4.2 GET `/users/:id` - Obtener Usuario por ID

**Requiere**: Token JWT (propio usuario o ADMIN)

**Response:** Mismo formato que `User` arriba

```typescript
const getUserById = async (userId: string) => {
  const response = await axiosInstance.get(`/users/${userId}`);
  return response.data;
};
```

---

### 4.3 PUT `/users/update/user` - Actualizar Perfil Propio

**Request Body:**
```typescript
interface UpdateUserDto {
  name?: string;       // 3-80 caracteres
  phone?: string;      // Formato E.164
  birthDate?: string;  // YYYY-MM-DD
  username?: string;   // 3-80 caracteres, único
  address?: string;    // Texto libre (deprecated, usar addresses)
}
```

**Response:** Usuario actualizado

```typescript
const updateProfile = async (data: UpdateUserDto) => {
  const response = await axiosInstance.put('/users/update/user', data);
  return response.data;
};
```

---

### 4.4 PATCH `/users/password` - Cambiar Contraseña

**Request Body:**
```typescript
interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;      // Mismas validaciones que signup
  confirmPassword: string;
}
```

**Response:**
```typescript
{
  message: 'Contraseña actualizada correctamente'
}
```

**Ejemplo:**
```typescript
const changePassword = async (data: UpdatePasswordDto) => {
  const response = await axiosInstance.patch('/users/password', data);
  return response.data;
};
```

---

### 4.5 POST `/users/forgot-password` - Recuperar Contraseña

**Request Body:**
```typescript
interface ForgotPasswordDto {
  email: string;
}
```

**Response (200):**
```typescript
{
  message: 'If the email exists, the password reset link has been sent.'
}
```

**Nota:** Por seguridad, siempre retorna 200 aunque el email no exista.

---

### 4.6 POST `/users/reset-password` - Resetear Contraseña con Token

**Request Body:**
```typescript
interface ResetPasswordDto {
  token: string;          // Token enviado por email
  newPassword: string;
  confirmPassword: string;
}
```

**Response:**
```typescript
{
  message: 'Password reset successfully'
}
```

---

### 4.7 Gestión de Direcciones

#### POST `/users/addresses` - Agregar Dirección

**Request Body:**
```typescript
interface CreateAddressDto {
  label: string;          // Ej: "Casa", "Trabajo"
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;     // Si true, otras se marcan como false
}
```

**Response:** Dirección creada con ID generado

```typescript
interface UserAddress extends CreateAddressDto {
  id: string;  // UUID generado
}
```

---

#### GET `/users/addresses/my-addresses` - Obtener Mis Direcciones

**Response:**
```typescript
UserAddress[]
```

---

#### PATCH `/users/addresses/:addressId` - Actualizar Dirección

**Request Body:** Parcial de `CreateAddressDto`

```typescript
const updateAddress = async (addressId: string, data: Partial<CreateAddressDto>) => {
  const response = await axiosInstance.patch(`/users/addresses/${addressId}`, data);
  return response.data;
};
```

---

#### DELETE `/users/addresses/:addressId` - Eliminar Dirección

**Response:**
```typescript
{
  message: string;
}
```

---

#### PATCH `/users/addresses/:addressId/set-default` - Marcar como Predeterminada

**Response:** Dirección actualizada con `isDefault: true`

---

### 4.8 GET `/users/stats/me` - Estadísticas Personales

**Response:**
```typescript
interface UserStats {
  totalOrders: number;          // Total de órdenes
  totalSpent: number;           // Monto total gastado
  wishlistItemsCount: number;   // Items en wishlist
  reviewsCount: number;         // Reviews escritas
}
```

**Ejemplo de uso:**
```typescript
const getUserStats = async () => {
  const response = await axiosInstance.get('/users/stats/me');
  return response.data;
};

// Uso en dashboard
const stats = await getUserStats();
console.log(`Has gastado $${stats.totalSpent} en ${stats.totalOrders} órdenes`);
```

---

### 4.9 DELETE `/users/:id` - Eliminar Usuario (Soft Delete)

**Requiere**: Token del propio usuario o ADMIN

**Response:**
```typescript
{
  message: string;
}
```

**Nota:** Es soft delete, el usuario se marca con `deletedAt` pero no se borra físicamente.

---

### 4.10 PATCH `/users/restore/:id` - Restaurar Usuario Eliminado (ADMIN)

**Response:** Usuario restaurado

---

### 4.11 PATCH `/users/roles/:id` - Cambiar Rol de Usuario (SUPER_ADMIN)

**Requiere**: SUPER_ADMIN

**Request Body:**
```typescript
interface UpdateRoleDto {
  role: 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN';
}
```

**Response:** Usuario actualizado con nuevo rol

**Ejemplo:**
```typescript
const changeUserRole = async (userId: string, role: UserRole) => {
  const response = await axiosInstance.patch(`/users/roles/${userId}`, { role });
  return response.data;
};

// Uso - Promover usuario a ADMIN
await changeUserRole('user-uuid', 'ADMIN');
```

**Notas:**
- Solo SUPER_ADMIN puede cambiar roles
- No se puede cambiar el propio rol
- Cambios de rol son inmediatos

---

## 5. MÓDULO DE PRODUCTOS

### 5.1 GET `/products` - Listar Productos (PÚBLICO)

**Query Params:**
```typescript
interface ProductsSearchQuery {
  page?: number;        // Default: 1
  limit?: number;       // Default: 10
  name?: string;        // Búsqueda parcial en nombre
  brand?: string;       // Filtro exacto por marca
  price?: number;       // Busca productos en rango ±10%
  featured?: boolean;   // Solo productos destacados
}
```

**Response:**
```typescript
interface PaginatedProductsResponse {
  items: ResponseProductDto[];
  total: number;
  pages: number;
}

interface ResponseProductDto {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string | null;
  basePrice: number;
  baseStock: number;
  imgUrls: string[];
  specifications: Record<string, any>;
  isActive: boolean;
  hasVariants: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    categoryName: string;
  };
  variants: ProductVariant[];
  files: File[];
}

interface ProductVariant {
  id: string;
  type: 'RAM' | 'STORAGE' | 'COLOR' | 'PROCESSOR' | 'WARRANTY' | 'KEYBOARD_LAYOUT' | 'DPI' | 'SWITCH_TYPE';
  name: string;
  description: string | null;
  priceModifier: number;  // Puede ser negativo
  stock: number;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

**Ejemplo:**
```typescript
const getProducts = async (params: ProductsSearchQuery) => {
  const response = await axiosInstance.get('/products', { params });
  return response.data;
};

// Búsqueda por nombre
const laptops = await getProducts({ name: 'laptop', page: 1, limit: 20 });

// Filtrar por marca
const dellProducts = await getProducts({ brand: 'Dell' });

// Productos destacados
const featured = await getProducts({ featured: true, limit: 10 });

// Búsqueda por precio (busca entre $900 y $1100)
const products = await getProducts({ price: 1000 });
```

---

### 5.2 GET `/products/featured` - Productos Destacados

**Query Params:**
```typescript
{
  limit?: number;  // Default: 10
}
```

**Response:** Array de `ResponseProductDto`

```typescript
const getFeaturedProducts = async (limit = 10) => {
  const response = await axiosInstance.get('/products/featured', {
    params: { limit }
  });
  return response.data;
};
```

---

### 5.3 GET `/products/brand/:brand` - Productos por Marca

**Response:** Array de productos

```typescript
const getProductsByBrand = async (brand: string) => {
  const response = await axiosInstance.get(`/products/brand/${brand}`);
  return response.data;
};
```

---

### 5.4 GET `/products/category/:categoryId` - Productos por Categoría

**Response:** Array de productos activos de esa categoría

```typescript
const getProductsByCategory = async (categoryId: string) => {
  const response = await axiosInstance.get(`/products/category/${categoryId}`);
  return response.data;
};
```

---

### 5.5 GET `/products/search` - Búsqueda con Autocompletado

**Query Params:**
```typescript
{
  q: string;      // Término de búsqueda (REQUERIDO)
  limit?: number; // Default: 10
}
```

**Busca en:** nombre, marca, descripción

**Response:** Array de productos

```typescript
const searchProducts = async (query: string, limit = 10) => {
  const response = await axiosInstance.get('/products/search', {
    params: { q: query, limit }
  });
  return response.data;
};

// Uso en barra de búsqueda
const handleSearch = debounce(async (searchTerm: string) => {
  if (searchTerm.length >= 2) {
    const results = await searchProducts(searchTerm, 5);
    setSearchResults(results);
  }
}, 300);
```

---

### 5.6 GET `/products/:id/related` - Productos Relacionados

**Query Params:**
```typescript
{
  limit?: number;  // Default: 6
}
```

**Lógica:** Busca productos de la misma categoría y/o marca, excluyendo el producto actual.

**Response:** Array de productos

```typescript
const getRelatedProducts = async (productId: string, limit = 6) => {
  const response = await axiosInstance.get(`/products/${productId}/related`, {
    params: { limit }
  });
  return response.data;
};
```

---

### 5.7 GET `/products/:id` - Obtener Producto por ID (PÚBLICO)

**Response:** `ResponseProductDto` con todas las variantes y archivos

```typescript
const getProductById = async (productId: string) => {
  const response = await axiosInstance.get(`/products/${productId}`);
  return response.data;
};
```

---

### 5.8 GET `/products/:id/price` - Calcular Precio con Variantes

**Query Params:**
```typescript
{
  variants?: string;  // IDs separados por comas: "uuid1,uuid2,uuid3"
}
```

**Response:**
```typescript
{
  productId: string;
  variantIds: string[];
  finalPrice: number;  // basePrice + sum(variant.priceModifier)
}
```

**Ejemplo:**
```typescript
const calculatePrice = async (productId: string, variantIds: string[]) => {
  const response = await axiosInstance.get(`/products/${productId}/price`, {
    params: { variants: variantIds.join(',') }
  });
  return response.data;
};

// Uso
const price = await calculatePrice('product-uuid', [
  'variant-ram-16gb-uuid',
  'variant-storage-512gb-uuid'
]);
console.log('Precio final:', price.finalPrice);
```

---

### 5.9 GET `/products/:id/stock` - Obtener Stock Disponible

**Query Params:**
```typescript
{
  variants?: string;  // IDs separados por comas
}
```

**Response:**
```typescript
{
  productId: string;
  variantIds: string[];
  availableStock: number;  // Stock mínimo entre baseStock y variantes seleccionadas
}
```

**Ejemplo:**
```typescript
const getStock = async (productId: string, variantIds: string[]) => {
  const response = await axiosInstance.get(`/products/${productId}/stock`, {
    params: { variants: variantIds.join(',') }
  });
  return response.data;
};
```

---

### 5.10 POST `/products` - Crear Producto (ADMIN)

**Request Body:**
```typescript
interface CreateProductDto {
  name: string;              // 3-200 caracteres
  description: string;       // 10-500 caracteres
  brand: string;             // 2-50 caracteres
  model?: string;            // Opcional, hasta 100 caracteres
  basePrice: number;         // >= 0.01
  baseStock: number;         // >= 0
  categoryName: string;      // Nombre de categoría existente
  imgUrls?: string[];        // URLs de imágenes (opcional)
  specifications?: {         // Opcional
    screenSize?: string;
    resolution?: string;
    batteryLife?: string;
    weight?: string;
    ports?: string[];
    socket?: string;
    chipset?: string;
    tdp?: string;
    dpi?: string;
    switches?: string;
    warranty?: string;
    dimensions?: string;
    includedItems?: string[];
    [key: string]: any;      // Campos personalizados
  };
  featured?: boolean;        // Default: false
}
```

**Response:** Producto creado

**Ejemplo:**
```typescript
const createProduct = async (data: CreateProductDto) => {
  const response = await axiosInstance.post('/products', data);
  return response.data;
};
```

---

### 5.11 PUT `/products/:id` - Actualizar Producto (ADMIN)

**Request Body:** Parcial de `CreateProductDto`

---

### 5.12 DELETE `/products/:id` - Desactivar Producto (ADMIN)

**Nota:** Es soft delete, marca `isActive: false`

**Response:**
```typescript
{
  id: string;
  message: string;
}
```

---

### 5.13 Gestión de Variantes (ADMIN)

#### POST `/products/:id/variants` - Agregar Variante

**Request Body:**
```typescript
interface CreateVariantDto {
  type: 'RAM' | 'STORAGE' | 'COLOR' | 'PROCESSOR' | 'WARRANTY' | 'KEYBOARD_LAYOUT' | 'DPI' | 'SWITCH_TYPE';
  name: string;              // 1-100 caracteres
  description?: string;      // Opcional, hasta 200 caracteres
  priceModifier: number;     // Puede ser negativo
  stock: number;             // >= 0
  isAvailable?: boolean;     // Default: true
  sortOrder?: number;        // Default: 0
}
```

**Response:** Variante creada

---

#### PUT `/products/variants/:variantId` - Actualizar Variante

**Request Body:** Parcial de `CreateVariantDto`

---

#### DELETE `/products/variants/:variantId` - Eliminar Variante

**Response:**
```typescript
{
  id: string;
  message: string;
}
```

---

### 5.14 POST `/products/seeder` - Cargar Datos de Prueba (ADMIN)

**Response:**
```typescript
{
  message: string;
  total: number;
}
```

**Nota:** Carga 10+ productos con variantes desde `src/seeds/products.data.ts`

---

## 6. MÓDULO DE CARRITO

### 6.1 GET `/cart/id` - Obtener Mi Carrito

**Response:**
```typescript
interface ICartResponseDTO {
  id: string;
  total: number;
  user_id: string;
  selectedAddressId: string | null;
  createdAt: string;
  updatedAt: string;
  items: CartItemResponse[];
}

interface CartItemResponse {
  id: string;
  quantity: number;
  priceAtAddition: number;
  subtotal: number;
  selectedVariants: {
    id: string;
    type: string;
    name: string;
    priceModifier: number;
  }[] | null;
  addedAt: string;
  product: ResponseProductDto;
}
```

**Ejemplo:**
```typescript
const getMyCart = async () => {
  const response = await axiosInstance.get('/cart/id');
  return response.data;
};
```

---

### 6.2 GET `/cart/summary` - Resumen Optimizado (para Navbar)

**Response:**
```typescript
interface IResponseCartSummaryDTO {
  itemCount: number;  // Suma de cantidades
  total: number;      // Total del carrito
  hasItems: boolean;
}
```

**Ejemplo:**
```typescript
const getCartSummary = async () => {
  const response = await axiosInstance.get('/cart/summary');
  return response.data;
};

// Uso en navbar
const { itemCount, total } = await getCartSummary();
```

---

### 6.3 POST `/cart/add` - Agregar Producto al Carrito

**Request Body:**
```typescript
interface AddToCartDTO {
  productId: string;
  quantity: number;        // >= 1
  variantIds?: string[];   // IDs de variantes seleccionadas
}
```

**Response:** Carrito actualizado completo (`ICartResponseDTO`)

**Validaciones:**
- Producto debe existir y estar activo
- Stock suficiente
- Variantes deben existir y estar disponibles

**Ejemplo:**
```typescript
const addToCart = async (productId: string, quantity: number, variantIds?: string[]) => {
  const response = await axiosInstance.post('/cart/add', {
    productId,
    quantity,
    variantIds
  });
  return response.data;
};

// Sin variantes
await addToCart('product-uuid', 2);

// Con variantes
await addToCart('product-uuid', 1, ['ram-variant-uuid', 'storage-variant-uuid']);
```

---

### 6.4 PUT `/cart/items/:cartItemId` - Actualizar Cantidad

**Request Body:**
```typescript
interface UpdateCartItemDTO {
  quantity: number;  // >= 1
}
```

**Response:** Carrito actualizado completo

**Ejemplo:**
```typescript
const updateCartItemQuantity = async (cartItemId: string, quantity: number) => {
  const response = await axiosInstance.put(`/cart/items/${cartItemId}`, { quantity });
  return response.data;
};
```

---

### 6.5 DELETE `/cart/items/:cartItemId` - Eliminar Item

**Response:**
```typescript
{
  message: string;
  cart: ICartResponseDTO;
}
```

```typescript
const removeCartItem = async (cartItemId: string) => {
  const response = await axiosInstance.delete(`/cart/items/${cartItemId}`);
  return response.data;
};
```

---

### 6.6 DELETE `/cart/clear` - Vaciar Carrito

**Response:**
```typescript
{
  message: string;
}
```

---

### 6.7 POST `/cart/validate-stock` - Validar Stock Antes de Checkout

**Response:**
```typescript
interface IStockValidationResult {
  valid: boolean;
  issues: {
    itemId: string;
    productId: string;
    productName: string;
    issue: string;              // Descripción del problema
    requested: number;
    available: number;
  }[];
}
```

**Ejemplo:**
```typescript
const validateStock = async () => {
  const response = await axiosInstance.post('/cart/validate-stock');
  return response.data;
};

// Uso antes de checkout
const validation = await validateStock();
if (!validation.valid) {
  validation.issues.forEach(issue => {
    alert(`${issue.productName}: ${issue.issue}`);
  });
} else {
  // Proceder al checkout
}
```

---

### 6.8 POST `/cart/select-address` - Seleccionar Dirección de Envío

**Request Body:**
```typescript
interface SelectAddressDto {
  addressId: string;  // UUID de dirección guardada en user.addresses
}
```

**Response:**
```typescript
{
  message: 'Dirección seleccionada exitosamente para el checkout';
}
```

**Validación:** La dirección debe existir en `user.addresses`

---

### 6.9 GET `/cart/selected-address` - Obtener Dirección Seleccionada

**Response:**
```typescript
{
  selectedAddressId: string | null;
}
```

---

### 6.10 POST `/cart/checkout` - Crear Orden desde Carrito

**Request Body:**
```typescript
{
  shippingAddress: null;  // Usa la dirección seleccionada previamente
}
```

**Proceso:**
1. Valida stock
2. Crea `Order` + `OrderDetail` + `OrderItems`
3. Captura snapshot de productos y precios
4. Calcula IVA (21%) y envío
5. Decrementa stock
6. Vacía el carrito

**Cálculo de Envío:**
```typescript
subtotal > 250  → Envío gratis
subtotal > 100  → Envío $10
subtotal <= 100 → Envío $20
```

**Response:** Orden creada (`ResponseOrderDto`)

**Ejemplo:**
```typescript
const checkout = async () => {
  // 1. Validar stock
  const validation = await axiosInstance.post('/cart/validate-stock');
  if (!validation.data.valid) {
    throw new Error('Stock insuficiente');
  }

  // 2. Asegurar que hay dirección seleccionada
  const { selectedAddressId } = await axiosInstance.get('/cart/selected-address');
  if (!selectedAddressId) {
    throw new Error('Debes seleccionar una dirección de envío');
  }

  // 3. Crear orden
  const response = await axiosInstance.post('/cart/checkout', {
    shippingAddress: null
  });

  return response.data;
};
```

---

## 7. MÓDULO DE ÓRDENES

### 7.1 GET `/orders/my-orders` - Mis Órdenes

**Response:** Array de `ResponseOrderDto`

```typescript
interface ResponseOrderDto {
  id: string;
  orderNumber: string;  // Ej: "ORD-2024-01-0001"
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  user: {
    id: string;
    name: string;
    email: string;
  };
  orderDetail: {
    id: string;
    subtotal: number;
    tax: number;         // 21% IVA
    shipping: number;
    total: number;
    shippingAddressId: string | null;
    shippingAddressSnapshot: UserAddress | null;
    paymentMethod: string | null;
    items: OrderItemDto[];
  };
}

interface OrderItemDto {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variantsSnapshot: {
    id: string;
    type: string;
    name: string;
    priceModifier: number;
  }[] | null;
  productSnapshot: {
    name: string;
    description: string;
    basePrice: number;
  };
  createdAt: string;
  product: ResponseProductDto | null;
}
```

**Ejemplo:**
```typescript
const getMyOrders = async () => {
  const response = await axiosInstance.get('/orders/my-orders');
  return response.data;
};
```

---

### 7.2 GET `/orders/:id` - Obtener Orden por ID

**Validación:** Solo el usuario dueño o ADMIN puede ver la orden

**Response:** `ResponseOrderDto`

---

### 7.3 GET `/orders` - Listar Todas las Órdenes (ADMIN)

**Query Params:**
```typescript
interface OrderFiltersDto {
  page?: number;
  limit?: number;
  status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  orderNumber?: string;  // Búsqueda exacta
  userEmail?: string;    // Búsqueda parcial
}
```

**Response:**
```typescript
interface PaginatedOrdersDto {
  items: ResponseOrderDto[];
  total: number;
  pages: number;
  currentPage: number;
}
```

**Ejemplo:**
```typescript
const getAllOrders = async (filters: OrderFiltersDto) => {
  const response = await axiosInstance.get('/orders', { params: filters });
  return response.data;
};

// Filtrar órdenes pendientes de enero 2024
const orders = await getAllOrders({
  status: 'pending',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  page: 1,
  limit: 20
});
```

---

### 7.4 GET `/orders/stats` - Estadísticas de Órdenes (ADMIN)

**Response:**
```typescript
{
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: {
    pending: number;
    paid: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
}
```

---

### 7.5 POST `/orders/:id/confirm-payment` - Confirmar Pago

**Request Body:**
```typescript
{
  paymentMethod: 'credit_card' | 'debit_card' | 'mercadopago' | 'paypal' | 'cash';
  transactionId?: string;  // Opcional
}
```

**Validación:** Orden debe estar en estado `pending`

**Acción:** Cambia estado a `paid`

**Response:** Orden actualizada

**Ejemplo:**
```typescript
const confirmPayment = async (orderId: string, paymentMethod: string) => {
  const response = await axiosInstance.post(`/orders/${orderId}/confirm-payment`, {
    paymentMethod,
    transactionId: `TRX-${Date.now()}`
  });
  return response.data;
};
```

---

### 7.6 PUT `/orders/:id/status` - Actualizar Estado (ADMIN)

**Request Body:**
```typescript
interface UpdateOrderStatusDto {
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod?: string;  // Opcional
}
```

**Flujo de estados permitido:**
```
PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
   ↓         ↓
CANCELLED  CANCELLED
```

**Response:** Orden actualizada

---

### 7.7 POST `/orders/:OrderId/:UserId/cancel` - Cancelar Orden (SUPER_ADMIN)

**Validación:** Solo órdenes en estado `pending` o `paid`

**Acción:**
- Cambia estado a `cancelled`
- Restaura stock de productos

**Response:** Orden cancelada

---

## 8. MÓDULO DE REVIEWS

### 8.1 POST `/review` - Crear Review

**Request Body:**
```typescript
interface CreateReviewDto {
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  message: string;
}
```

**Validaciones:**
- Un usuario solo puede dejar una review por producto
- Rating debe ser entre 1 y 5

**Response:**
```typescript
interface ReviewResponse {
  id: string;
  rating: number;
  message: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
  product: {
    id: string;
    name: string;
  };
}
```

**Ejemplo:**
```typescript
const createReview = async (productId: string, rating: number, message: string) => {
  const response = await axiosInstance.post('/review', {
    productId,
    rating,
    message
  });
  return response.data;
};
```

---

### 8.2 GET `/review/product/:productId/public` - Reviews Públicas de Producto

**Nota:** No requiere autenticación

**Response:** Array de `ReviewResponse` donde `isVisible: true`

**Ejemplo:**
```typescript
const getProductReviews = async (productId: string) => {
  const response = await axiosInstance.get(`/review/product/${productId}/public`);
  return response.data;
};

// Uso en página de producto
const reviews = await getProductReviews(productId);
const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
```

---

### 8.3 GET `/review/can-review/:productId` - Verificar si Puede Reviewar

**Response:**
```typescript
{
  canReview: boolean;
  hasReviewed: boolean;
  message: string;
}
```

**Ejemplo:**
```typescript
const canReview = async (productId: string) => {
  const response = await axiosInstance.get(`/review/can-review/${productId}`);
  return response.data;
};

// Uso
const { canReview, hasReviewed } = await canReview(productId);
if (!canReview) {
  alert('Ya has dejado una reseña para este producto');
}
```

---

### 8.4 GET `/review` - Listar Reviews con Filtros (ADMIN)

**Query Params:**
```typescript
interface ReviewFiltersDto {
  page?: number;
  limit?: number;
  rating?: 1 | 2 | 3 | 4 | 5;
  productId?: string;
  userName?: string;  // Búsqueda parcial
}
```

**Response:**
```typescript
interface PaginatedReviewsDto {
  items: ReviewResponse[];
  total: number;
  pages: number;
}
```

---

### 8.5 GET `/review/:id` - Obtener Review por ID

**Requiere**: Autenticación (CLIENT)

**Response:** `ReviewResponse`

**Ejemplo:**
```typescript
const getReviewById = async (reviewId: string) => {
  const response = await axiosInstance.get(`/review/${reviewId}`);
  return response.data;
};
```

---

### 8.6 GET `/review/product/:productId` - Todas las Reviews de Producto (ADMIN)

**Requiere**: ADMIN

**Nota:** Incluye reviews ocultas (`isVisible: false`). Para reviews públicas usar `/review/product/:productId/public`

**Response:** Array de `ReviewResponse` (incluye todas, sin filtrar por `isVisible`)

**Ejemplo:**
```typescript
const getAllProductReviews = async (productId: string) => {
  const response = await axiosInstance.get(`/review/product/${productId}`);
  return response.data;
};

// Uso en panel de administración
const allReviews = await getAllProductReviews(productId);
const hiddenReviews = allReviews.filter(r => !r.isVisible);
console.log(`Reviews ocultas: ${hiddenReviews.length}`);
```

---

### 8.7 DELETE `/review/:id` - Eliminar Review

**Validación:** Solo el usuario que creó la review puede eliminarla

**Response:** `void` (204 No Content)

---

## 9. MÓDULO DE WISHLIST

### 9.1 GET `/wishlist/my-wishlist` - Obtener Mi Wishlist

**Response:**
```typescript
interface WishlistResponseDto {
  id: string;
  user_id: string;
  createdAt: string;
  updatedAt: string;
  items: WishlistItemResponseDto[];
}

interface WishlistItemResponseDto {
  id: string;
  product_id: string;
  addedAt: string;
  product: ResponseProductDto;
}
```

**Ejemplo:**
```typescript
const getMyWishlist = async () => {
  const response = await axiosInstance.get('/wishlist/my-wishlist');
  return response.data;
};
```

---

### 9.2 GET `/wishlist/summary` - Resumen (para Navbar)

**Response:**
```typescript
interface WishlistSummaryDto {
  itemCount: number;
}
```

---

### 9.3 POST `/wishlist/add` - Agregar Producto

**Request Body:**
```typescript
interface AddToWishlistDto {
  productId: string;
}
```

**Validaciones:**
- Producto debe existir y estar activo
- No puede estar ya en la wishlist

**Response:** `WishlistItemResponseDto`

---

### 9.4 DELETE `/wishlist/remove/:productId` - Eliminar Producto

**Response:** `void` (204 No Content)

---

### 9.5 DELETE `/wishlist/clear` - Vaciar Wishlist

**Response:** `void` (204 No Content)

---

### 9.6 GET `/wishlist/check/:productId` - Verificar si Está en Wishlist

**Response:**
```typescript
{
  isInWishlist: boolean;
}
```

**Ejemplo:**
```typescript
const isInWishlist = async (productId: string) => {
  const response = await axiosInstance.get(`/wishlist/check/${productId}`);
  return response.data.isInWishlist;
};

// Uso en botón de wishlist
const inWishlist = await isInWishlist(productId);
setHeartFilled(inWishlist);
```

---

## 10. MÓDULO DE CATEGORÍAS

### 10.1 GET `/categories` - Listar Categorías (PÚBLICO)

**Query Params:**
```typescript
{
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
interface PaginatedCategoryDto {
  items: ResponseCategoryDto[];
  total: number;
  pages: number;
}

interface ResponseCategoryDto {
  id: string;
  categoryName: string;
}
```

---

### 10.2 GET `/categories/:id` - Obtener Categoría por ID

**Response:** `ResponseCategoryDto`

---

### 10.3 POST `/categories` - Crear Categoría (ADMIN)

**Request Body:**
```typescript
interface CreateCategoryDto {
  categoryName: string;  // Único, 1-50 caracteres
}
```

**Response:** Categoría creada

---

### 10.4 POST `/categories/seeder` - Precargar Categorías (ADMIN)

**Response:**
```typescript
{
  message: string;
  data?: Category[];
}
```

---

## 11. MÓDULO DE ROLES

### 11.1 POST `/roles/seed_roles` - Crear Roles Iniciales del Sistema

**Requiere**: Sin autenticación (primera instalación) o SUPER_ADMIN

**Descripción:** Crea los roles base del sistema. Este endpoint se usa **una sola vez** durante la configuración inicial del backend.

**Response:**
```typescript
{
  message: 'Seeds ejecutados exitosamente';
  roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'CLEANER', 'KEY_KEEPER'];
}
```

**Ejemplo:**
```typescript
const seedRoles = async () => {
  const response = await axiosInstance.post('/roles/seed_roles');
  return response.data;
};

// Uso en setup inicial
const result = await seedRoles();
console.log(result.message); // "Seeds ejecutados exitosamente"
```

**Notas:**
- Este endpoint solo debe ejecutarse **una vez** al configurar el sistema
- Si los roles ya existen, el endpoint puede retornar error o mensaje indicando que ya están creados
- Los roles creados son: SUPER_ADMIN, ADMIN, CLIENT, CLEANER, KEY_KEEPER
- CLEANER y KEY_KEEPER son roles internos del sistema

---

## 12. MÓDULO DE ARCHIVOS

### 12.1 POST `/files/uploadImage/:id` - Subir Imagen de Producto (ADMIN)

**URL Param:** `:id` = productId

**Request:** `multipart/form-data`

**Validaciones:**
- Tipos permitidos: JPEG, JPG, PNG, WEBP
- Tamaño máximo: 5MB

**Response:**
```typescript
{
  id: string;
  url: string;  // URL de Cloudinary
}
```

**Ejemplo:**
```typescript
const uploadProductImage = async (productId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosInstance.post(
    `/files/uploadImage/${productId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    }
  );

  return response.data;
};

// Uso con input file
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    try {
      const result = await uploadProductImage(productId, file);
      console.log('Imagen subida:', result.url);
    } catch (error) {
      console.error('Error al subir imagen:', error);
    }
  }
};
```

---

## 13. MANEJO DE ERRORES

### 13.1 Formato de Respuestas de Error

**Estructura estándar:**
```typescript
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  error: string | object;  // Puede ser string o detalles de validación
}
```

**Ejemplo de error de validación:**
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-10T15:30:45.123Z",
  "path": "/auth/signup",
  "error": {
    "message": [
      "email must be an email",
      "password must be stronger"
    ],
    "error": "Bad Request"
  }
}
```

### 13.2 Códigos de Estado HTTP

| Código | Significado | Cuándo Ocurre |
|--------|-------------|---------------|
| 200 | OK | Request exitoso |
| 201 | Created | Recurso creado (POST) |
| 204 | No Content | Eliminación exitosa |
| 400 | Bad Request | Validación fallida, datos inválidos |
| 401 | Unauthorized | Token inválido o expirado |
| 403 | Forbidden | Sin permisos para la acción |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Duplicado (ej: email ya existe) |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Error del servidor |

### 13.3 Manejo de Errores en Frontend

```typescript
// utils/errorHandler.ts
import { AxiosError } from 'axios';

export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data?.error;

    let message = 'Ocurrió un error inesperado';

    if (typeof errorData === 'string') {
      message = errorData;
    } else if (errorData?.message) {
      if (Array.isArray(errorData.message)) {
        message = errorData.message.join(', ');
      } else {
        message = errorData.message;
      }
    }

    return {
      statusCode,
      message,
      details: errorData
    };
  }

  return {
    statusCode: 500,
    message: 'Error de red o servidor no disponible'
  };
};

// Uso
try {
  await signup(data);
} catch (error) {
  const apiError = handleApiError(error);

  switch (apiError.statusCode) {
    case 400:
      toast.error(apiError.message);
      break;
    case 409:
      toast.error('Email ya registrado');
      break;
    case 429:
      toast.error('Demasiados intentos, espera un momento');
      break;
    default:
      toast.error('Error del servidor');
  }
}
```

---

## 14. TIPOS TYPESCRIPT

### 14.1 Archivo de Tipos Completo

```typescript
// types/api.ts

// ==================== AUTH ====================
export interface SignupRequest {
  name: string;
  email: string;
  birthDate: string;
  phone: string;
  username: string;
  password: string;
  confirmPassword: string;
  address?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  username?: string;
  role: UserRole;
  permissions: Record<string, string[]>;
  exp: number;
  iat: number;
}

// ==================== USERS ====================
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENT';

export interface UserAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  birthDate: string;
  role: UserRole;
  addresses: UserAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  birthDate?: string;
  username?: string;
  address?: string;
}

export interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateAddressDto {
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface UserStats {
  totalOrders: number;
  totalSpent: number;
  wishlistItemsCount: number;
  reviewsCount: number;
}

// ==================== PRODUCTS ====================
export type VariantType =
  | 'RAM'
  | 'STORAGE'
  | 'COLOR'
  | 'PROCESSOR'
  | 'WARRANTY'
  | 'KEYBOARD_LAYOUT'
  | 'DPI'
  | 'SWITCH_TYPE';

export interface ProductVariant {
  id: string;
  type: VariantType;
  name: string;
  description: string | null;
  priceModifier: number;
  stock: number;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSpecifications {
  screenSize?: string;
  resolution?: string;
  batteryLife?: string;
  weight?: string;
  ports?: string[];
  socket?: string;
  chipset?: string;
  tdp?: string;
  dpi?: string;
  switches?: string;
  warranty?: string;
  dimensions?: string;
  includedItems?: string[];
  [key: string]: any;
}

export interface ProductDto {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string | null;
  basePrice: number;
  baseStock: number;
  imgUrls: string[];
  specifications: ProductSpecifications;
  isActive: boolean;
  hasVariants: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    categoryName: string;
  };
  variants: ProductVariant[];
  files: FileDto[];
}

export interface CreateProductDto {
  name: string;
  description: string;
  brand: string;
  model?: string;
  basePrice: number;
  baseStock: number;
  categoryName: string;
  imgUrls?: string[];
  specifications?: ProductSpecifications;
  featured?: boolean;
}

export interface CreateVariantDto {
  type: VariantType;
  name: string;
  description?: string;
  priceModifier: number;
  stock: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

// ==================== CART ====================
export interface AddToCartDto {
  productId: string;
  quantity: number;
  variantIds?: string[];
}

export interface UpdateCartItemDto {
  quantity: number;
}

export interface CartItemDto {
  id: string;
  quantity: number;
  priceAtAddition: number;
  subtotal: number;
  selectedVariants: {
    id: string;
    type: string;
    name: string;
    priceModifier: number;
  }[] | null;
  addedAt: string;
  product: ProductDto;
}

export interface CartDto {
  id: string;
  total: number;
  user_id: string;
  selectedAddressId: string | null;
  createdAt: string;
  updatedAt: string;
  items: CartItemDto[];
}

export interface CartSummaryDto {
  itemCount: number;
  total: number;
  hasItems: boolean;
}

export interface StockValidationResult {
  valid: boolean;
  issues: {
    itemId: string;
    productId: string;
    productName: string;
    issue: string;
    requested: number;
    available: number;
  }[];
}

// ==================== ORDERS ====================
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItemDto {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variantsSnapshot: {
    id: string;
    type: string;
    name: string;
    priceModifier: number;
  }[] | null;
  productSnapshot: {
    name: string;
    description: string;
    basePrice: number;
  };
  createdAt: string;
  product: ProductDto | null;
}

export interface OrderDetailDto {
  id: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddressId: string | null;
  shippingAddressSnapshot: UserAddress | null;
  paymentMethod: string | null;
  items: OrderItemDto[];
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  user: {
    id: string;
    name: string;
    email: string;
  };
  orderDetail: OrderDetailDto;
}

export interface OrderFiltersDto {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  orderNumber?: string;
  userEmail?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  paymentMethod?: string;
}

// ==================== REVIEWS ====================
export type Rating = 1 | 2 | 3 | 4 | 5;

export interface CreateReviewDto {
  productId: string;
  rating: Rating;
  message: string;
}

export interface ReviewDto {
  id: string;
  rating: Rating;
  message: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
  product: {
    id: string;
    name: string;
  };
}

// ==================== WISHLIST ====================
export interface AddToWishlistDto {
  productId: string;
}

export interface WishlistItemDto {
  id: string;
  product_id: string;
  addedAt: string;
  product: ProductDto;
}

export interface WishlistDto {
  id: string;
  user_id: string;
  createdAt: string;
  updatedAt: string;
  items: WishlistItemDto[];
}

export interface WishlistSummaryDto {
  itemCount: number;
}

// ==================== CATEGORIES ====================
export interface CategoryDto {
  id: string;
  categoryName: string;
}

export interface CreateCategoryDto {
  categoryName: string;
}

// ==================== FILES ====================
export interface FileDto {
  id: string;
  url: string;
}

// ==================== PAGINATION ====================
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages: number;
  currentPage?: number;
}

// ==================== ERRORS ====================
export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  error: string | {
    message: string | string[];
    error: string;
  };
}
```

---

## 15. EJEMPLOS DE INTEGRACIÓN

### 15.1 Hook de Autenticación (React)

```typescript
// hooks/useAuth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LoginRequest, SignupRequest, UserDto, LoginResponse } from '@/types/api';
import { axiosInstance } from '@/api/axios';
import jwtDecode from 'jwt-decode';

interface AuthState {
  user: UserDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await axiosInstance.post<LoginResponse>(
            '/auth/signin/user',
            credentials
          );

          const { accessToken, user } = response.data;

          set({
            token: accessToken,
            user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (data) => {
        set({ isLoading: true });
        try {
          const response = await axiosInstance.post<UserDto>('/auth/signup', data);

          // Después de signup, hacer login automático
          await get().login({
            email: data.email,
            password: data.password
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },

      refreshUser: async () => {
        const { token, user } = get();
        if (!token || !user) return;

        try {
          const response = await axiosInstance.get<UserDto>(`/users/${user.id}`);
          set({ user: response.data });
        } catch (error) {
          console.error('Error refreshing user:', error);
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
```

---

### 15.2 Hook de Carrito

```typescript
// hooks/useCart.ts
import { create } from 'zustand';
import { CartDto, AddToCartDto, CartSummaryDto } from '@/types/api';
import { axiosInstance } from '@/api/axios';

interface CartState {
  cart: CartDto | null;
  summary: CartSummaryDto | null;
  isLoading: boolean;

  fetchCart: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  addToCart: (data: AddToCartDto) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  selectAddress: (addressId: string) => Promise<void>;
  checkout: () => Promise<any>;
}

export const useCart = create<CartState>((set, get) => ({
  cart: null,
  summary: null,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get<CartDto>('/cart/id');
      set({ cart: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchSummary: async () => {
    try {
      const response = await axiosInstance.get<CartSummaryDto>('/cart/summary');
      set({ summary: response.data });
    } catch (error) {
      console.error('Error fetching cart summary:', error);
    }
  },

  addToCart: async (data) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.post<CartDto>('/cart/add', data);
      set({ cart: response.data, isLoading: false });
      await get().fetchSummary();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      const response = await axiosInstance.put<CartDto>(
        `/cart/items/${itemId}`,
        { quantity }
      );
      set({ cart: response.data });
      await get().fetchSummary();
    } catch (error) {
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      const response = await axiosInstance.delete<{ cart: CartDto }>(
        `/cart/items/${itemId}`
      );
      set({ cart: response.data.cart });
      await get().fetchSummary();
    } catch (error) {
      throw error;
    }
  },

  clearCart: async () => {
    try {
      await axiosInstance.delete('/cart/clear');
      set({ cart: null, summary: null });
    } catch (error) {
      throw error;
    }
  },

  selectAddress: async (addressId) => {
    try {
      await axiosInstance.post('/cart/select-address', { addressId });
      await get().fetchCart();
    } catch (error) {
      throw error;
    }
  },

  checkout: async () => {
    try {
      const response = await axiosInstance.post('/cart/checkout', {
        shippingAddress: null
      });
      set({ cart: null, summary: null });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}));
```

---

### 15.3 Hook de Productos

```typescript
// hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { ProductDto, PaginatedResponse } from '@/types/api';
import { axiosInstance } from '@/api/axios';

interface ProductFilters {
  page?: number;
  limit?: number;
  name?: string;
  brand?: string;
  price?: number;
  featured?: boolean;
}

export const useProducts = (filters: ProductFilters) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const response = await axiosInstance.get<PaginatedResponse<ProductDto>>(
        '/products',
        { params: filters }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });
};

export const useProduct = (productId: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await axiosInstance.get<ProductDto>(`/products/${productId}`);
      return response.data;
    },
    enabled: !!productId
  });
};

export const useFeaturedProducts = (limit = 10) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async () => {
      const response = await axiosInstance.get<ProductDto[]>('/products/featured', {
        params: { limit }
      });
      return response.data;
    }
  });
};

export const useRelatedProducts = (productId: string, limit = 6) => {
  return useQuery({
    queryKey: ['products', 'related', productId, limit],
    queryFn: async () => {
      const response = await axiosInstance.get<ProductDto[]>(
        `/products/${productId}/related`,
        { params: { limit } }
      );
      return response.data;
    },
    enabled: !!productId
  });
};
```

---

### 15.4 Componente de Login

```typescript
// pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { handleApiError } from '@/utils/errorHandler';
import { toast } from 'react-hot-toast';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData);
      toast.success('¡Bienvenido!');
      navigate('/');
    } catch (error) {
      const apiError = handleApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/google';
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Iniciar Sesión</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className="mt-4">
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white border py-2 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
          Continuar con Google
        </button>
      </div>
    </div>
  );
};
```

---

### 15.5 Componente de Producto con Variantes

```typescript
// pages/ProductDetail.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { ProductVariant } from '@/types/api';
import { toast } from 'react-hot-toast';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id!);
  const { addToCart } = useCart();

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [finalPrice, setFinalPrice] = useState(0);

  // Agrupar variantes por tipo
  const variantsByType = product?.variants.reduce((acc, variant) => {
    if (!acc[variant.type]) acc[variant.type] = [];
    acc[variant.type].push(variant);
    return acc;
  }, {} as Record<string, ProductVariant[]>) || {};

  // Calcular precio cuando cambian las variantes
  useEffect(() => {
    if (!product) return;

    let price = product.basePrice;
    Object.values(selectedVariants).forEach(variantId => {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        price += variant.priceModifier;
      }
    });
    setFinalPrice(price);
  }, [selectedVariants, product]);

  const handleAddToCart = async () => {
    try {
      await addToCart({
        productId: id!,
        quantity,
        variantIds: Object.values(selectedVariants)
      });
      toast.success('Producto agregado al carrito');
    } catch (error) {
      toast.error('Error al agregar al carrito');
    }
  };

  if (isLoading) return <div>Cargando...</div>;
  if (!product) return <div>Producto no encontrado</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imágenes */}
        <div>
          <img
            src={product.imgUrls[0] || '/placeholder.png'}
            alt={product.name}
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.brand}</p>
          <p className="text-2xl font-bold text-blue-600 mb-6">
            ${finalPrice.toFixed(2)}
          </p>

          {/* Variantes */}
          {Object.entries(variantsByType).map(([type, variants]) => (
            <div key={type} className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {type}
              </label>
              <div className="flex gap-2 flex-wrap">
                {variants
                  .filter(v => v.isAvailable)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariants({
                        ...selectedVariants,
                        [type]: variant.id
                      })}
                      className={`px-4 py-2 border rounded-md ${
                        selectedVariants[type] === variant.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                    >
                      {variant.name}
                      {variant.priceModifier !== 0 && (
                        <span className="ml-2 text-sm">
                          ({variant.priceModifier > 0 ? '+' : ''}
                          ${variant.priceModifier})
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}

          {/* Cantidad */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Cantidad</label>
            <input
              type="number"
              min="1"
              max={product.baseStock}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-20 px-3 py-2 border rounded-md"
            />
          </div>

          {/* Agregar al carrito */}
          <button
            onClick={handleAddToCart}
            disabled={product.baseStock === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {product.baseStock === 0 ? 'Sin stock' : 'Agregar al Carrito'}
          </button>

          {/* Descripción */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Descripción</h2>
            <p className="text-gray-700">{product.description}</p>
          </div>

          {/* Especificaciones */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-2">Especificaciones</h2>
              <dl className="grid grid-cols-2 gap-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-medium text-gray-700">{key}:</dt>
                    <dd className="text-gray-600">
                      {Array.isArray(value) ? value.join(', ') : value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## 16. FLUJOS COMPLETOS

### 16.1 Flujo de Compra Completo

```typescript
// 1. Usuario se registra
const newUser = await signup({
  name: 'Juan Pérez',
  email: 'juan@example.com',
  birthDate: '1990-05-15',
  phone: '+541122334455',
  username: 'juan87',
  password: 'Juan1234!',
  confirmPassword: 'Juan1234!'
});

// 2. Login automático después de signup (en hook useAuth)

// 3. Buscar productos
const products = await getProducts({ name: 'laptop', limit: 20 });

// 4. Ver detalle de producto
const product = await getProductById('product-uuid');

// 5. Agregar al carrito con variantes
await addToCart({
  productId: 'product-uuid',
  quantity: 1,
  variantIds: ['ram-16gb-uuid', 'storage-512gb-uuid']
});

// 6. Ver carrito
const cart = await getCart();

// 7. Agregar dirección de envío
const address = await createAddress({
  label: 'Casa',
  street: 'Av. Corrientes 1234',
  city: 'CABA',
  province: 'Buenos Aires',
  postalCode: 'C1043',
  country: 'Argentina',
  isDefault: true
});

// 8. Seleccionar dirección en carrito
await selectCartAddress(address.id);

// 9. Validar stock antes de checkout
const validation = await validateCartStock();
if (!validation.valid) {
  // Mostrar errores
  validation.issues.forEach(issue => {
    console.error(issue.productName, issue.issue);
  });
  return;
}

// 10. Crear orden
const order = await checkout();

// 11. Confirmar pago
const paidOrder = await confirmPayment(order.id, 'credit_card');

// 12. Ver orden
const myOrders = await getMyOrders();

// 13. Dejar review
await createReview({
  productId: 'product-uuid',
  rating: 5,
  message: 'Excelente producto!'
});
```

---

### 16.2 Flujo de Admin: Crear Producto

```typescript
// 1. Login como admin
await login({
  email: 'admin@example.com',
  password: 'Admin1234!'
});

// 2. Crear categoría si no existe
const category = await createCategory({
  categoryName: 'Laptops'
});

// 3. Crear producto
const product = await createProduct({
  name: 'Dell XPS 15',
  description: 'Laptop de alto rendimiento para profesionales',
  brand: 'Dell',
  model: 'XPS 15 9500',
  basePrice: 1299.99,
  baseStock: 10,
  categoryName: 'Laptops',
  imgUrls: [],
  specifications: {
    screenSize: '15.6 pulgadas',
    resolution: '1920x1200',
    batteryLife: '8 horas',
    weight: '1.8 kg'
  },
  featured: true
});

// 4. Subir imágenes
const imageFile = document.getElementById('file-input').files[0];
const uploadedImage = await uploadProductImage(product.id, imageFile);

// 5. Agregar variantes
await addVariant(product.id, {
  type: 'RAM',
  name: '16GB DDR4',
  description: 'Memoria RAM de alto rendimiento',
  priceModifier: 0,
  stock: 50,
  isAvailable: true,
  sortOrder: 1
});

await addVariant(product.id, {
  type: 'RAM',
  name: '32GB DDR4',
  description: 'Memoria RAM para tareas intensivas',
  priceModifier: 200,
  stock: 30,
  isAvailable: true,
  sortOrder: 2
});

await addVariant(product.id, {
  type: 'STORAGE',
  name: '512GB SSD',
  description: 'Almacenamiento SSD NVMe',
  priceModifier: 0,
  stock: 40,
  isAvailable: true,
  sortOrder: 1
});

await addVariant(product.id, {
  type: 'STORAGE',
  name: '1TB SSD',
  description: 'Almacenamiento SSD NVMe de 1TB',
  priceModifier: 150,
  stock: 20,
  isAvailable: true,
  sortOrder: 2
});

// 6. Verificar producto completo
const fullProduct = await getProductById(product.id);
console.log('Producto creado:', fullProduct);
```

---

## 17. BEST PRACTICES

### 17.1 Seguridad

1. **Nunca exponer el token en URL o console.log en producción**
```typescript
// ❌ MAL
console.log('Token:', token);
navigate(`/dashboard?token=${token}`);

// ✅ BIEN
// Usar localStorage o cookies httpOnly
localStorage.setItem('auth_token', token);
```

2. **Validar expiración del token**
```typescript
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};
```

3. **Limpiar datos sensibles al logout**
```typescript
const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  // Limpiar cookies si se usan
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};
```

---

### 17.2 Performance

1. **Cachear datos estáticos con React Query**
```typescript
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: getCategories,
  staleTime: 30 * 60 * 1000, // 30 minutos
  cacheTime: 60 * 60 * 1000  // 1 hora
});
```

2. **Debounce en búsquedas**
```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (term: string) => {
  const results = await searchProducts(term);
  setResults(results);
}, 300);
```

3. **Paginación infinita para listas largas**
```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['products'],
  queryFn: ({ pageParam = 1 }) => getProducts({ page: pageParam, limit: 20 }),
  getNextPageParam: (lastPage, pages) => {
    return lastPage.pages > pages.length ? pages.length + 1 : undefined;
  }
});
```

---

### 17.3 UX

1. **Loading states en todas las acciones**
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await someApiCall();
  } finally {
    setIsLoading(false);
  }
};
```

2. **Feedback visual inmediato**
```typescript
// Usar optimistic updates
const { mutate } = useMutation({
  mutationFn: updateCartQuantity,
  onMutate: async (newQuantity) => {
    // Cancelar queries en progreso
    await queryClient.cancelQueries({ queryKey: ['cart'] });

    // Snapshot del valor anterior
    const previousCart = queryClient.getQueryData(['cart']);

    // Actualizar optimistamente
    queryClient.setQueryData(['cart'], (old) => ({
      ...old,
      items: old.items.map(item =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    }));

    return { previousCart };
  },
  onError: (err, newQuantity, context) => {
    // Revertir en caso de error
    queryClient.setQueryData(['cart'], context.previousCart);
  }
});
```

3. **Validación de formularios antes de enviar**
```typescript
// Usar react-hook-form con zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener una mayúscula')
    .regex(/[a-z]/, 'Debe contener una minúscula')
    .regex(/[0-9]/, 'Debe contener un número')
    .regex(/[!@#$%^&*]/, 'Debe contener un carácter especial'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(signupSchema)
});
```

---

### 17.4 SEO y Accesibilidad

1. **Títulos dinámicos**
```typescript
import { Helmet } from 'react-helmet-async';

<Helmet>
  <title>{product.name} - Mi Tienda</title>
  <meta name="description" content={product.description} />
  <meta property="og:image" content={product.imgUrls[0]} />
</Helmet>
```

2. **Accesibilidad en componentes**
```typescript
<button
  aria-label="Agregar al carrito"
  aria-describedby="product-name"
  onClick={handleAddToCart}
>
  <ShoppingCartIcon />
</button>
```

---

## RESUMEN

Este documento cubre **ABSOLUTAMENTE TODO** lo que necesitas para integrar el frontend con el backend:

✅ **Configuración inicial** completa
✅ **Todos los endpoints** documentados con ejemplos
✅ **Tipos TypeScript** completos
✅ **Hooks personalizados** para React
✅ **Componentes de ejemplo** funcionales
✅ **Flujos completos** de usuario y admin
✅ **Manejo de errores** robusto
✅ **Best practices** de seguridad, performance y UX

**NO FALTA NADA**. Toda la información está aquí para que cualquier desarrollador frontend (o IA) pueda integrar el sistema sin problemas.

---

**¿Necesitas algo más específico?** Toda la información está documentada arriba. 🚀
