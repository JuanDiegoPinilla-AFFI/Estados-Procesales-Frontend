# 💻 Estados Procesales - Frontend Portal

![Angular](https://img.shields.io/badge/angular-DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SASS](https://img.shields.io/badge/SASS-hotpink.svg?style=for-the-badge&logo=SASS&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white)

Este repositorio contiene el código fuente de la interfaz de usuario para la plataforma **Estados Procesales**. Es una SPA (Single Page Application) moderna construida con **Angular** y **Standalone Components**, diseñada para ofrecer una experiencia fluida a usuarios internos (Affi) y externos (Inmobiliarias).

## 📋 Tabla de Contenidos
- [Arquitectura](#-arquitectura)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Configuración de Entorno](#-configuración-de-entorno)
- [Módulos de Negocio](#-módulos-de-negocio)
- [Seguridad](#-seguridad)

---

## 🏗 Arquitectura

El proyecto sigue una arquitectura de **Shell & Plugins** lógica, eliminando la dependencia de `AppModule` (Standalone APIs) para mejorar el rendimiento y la mantenibilidad.

* **Shell Layout:** Un "caparazón" ligero que maneja la estructura visual (Sidebar, Header, Breadcrumbs) y carga dinámicamente el contenido.
* **Plugin Registry:** El menú lateral no es estático; se construye en tiempo de ejecución registrando los módulos disponibles (`auth`, `redelex`, `users`, `inmobiliaria`) según los permisos del usuario.
* **Lazy Loading:** Todos los módulos de negocio se cargan bajo demanda para optimizar la carga inicial.
* **Smart Redirects:** El sistema decide automáticamente la pantalla de inicio ideal (`Dashboard` vs `Consultas`) basándose en el rol del usuario.

---

## 📂 Estructura del Proyecto

```bash
src/app/
├── core/             # El "Shell" de la aplicación
│   ├── guards/       # Protección de rutas (Role, Permission)
│   ├── layout/       # Componente principal (Sidebar, Header)
│   ├── services/     # Registro de plugins y bus de eventos
│   └── models/       # Interfaces base (PluginConfig)
├── features/         # Módulos de Negocio (Lazy Loaded)
│   ├── auth/         # Login, Registro, Recuperación
│   ├── inmobiliaria/ # Gestión de clientes y carga masiva
│   ├── redelex/      # Suite jurídica (Consultas, Dashboard)
│   └── users/        # Administración de perfiles
├── shared/           # Componentes reutilizables (Alerts, Loaders)
└── app.config.ts     # Configuración global (Proveedores, Rutas)

```

---

## 🛠 Requisitos Previos

* **Node.js:** v18.x o superior (Recomendado v20+).
* **Angular CLI:** v17+ (`npm install -g @angular/cli`).

---

## 🚀 Instalación y Ejecución

1. **Clonar el repositorio:**
```bash
git clone https://github.com/JuanDPAffi/redelex-front.git
cd redelex-front

```


2. **Instalar dependencias:**
```bash
npm install

```


3. **Ejecutar en desarrollo:**
```bash
npm start

```


La aplicación estará disponible en `http://localhost:4200`.
4. **Compilar para producción:**
```bash
npm run build

```


Los archivos generados estarán en la carpeta `dist/`.

---

## ⚙️ Configuración de Entorno

Asegúrate de configurar la URL del Backend en `src/environments/environment.ts` (desarrollo) y `environment.prod.ts` (producción).

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/' // Apuntando a tu NestJS local
};

```

---

## 🧩 Módulos de Negocio

### ⚖️ Redelex (Operación Jurídica)

* **Consulta Avanzada:** Búsqueda por Cédula (con filtros en memoria) o por ID de Proceso.
* **Visualización:** Stepper gráfico de etapas procesales y agrupación histórica de actuaciones por cuatrimestres.
* **Reportes:** Generación de PDFs y Excel en el navegador (`jspdf`, `exceljs`) con estilos corporativos.
* **Call Center:** Integración visual para crear tickets en HubSpot mientras se consulta un expediente.

### 🏢 Inmobiliaria (Gestión)

* **Importación Masiva:** Procesamiento de archivos Excel con validación previa y barra de progreso.
* **Filtros Compuestos:** Búsqueda cruzada por NIT, Ciudad y Estado.

### 👥 Usuarios (Admin)

* **Permisos Granulares:** Interfaz visual para activar/desactivar permisos específicos (`export`, `view_reports`) por usuario.
* **KPIs:** Métricas en tiempo real sobre la adopción de la plataforma.

---

## 🔐 Seguridad Frontend

La seguridad en el cliente está diseñada para trabajar en conjunto con las **Cookies HttpOnly** del backend.

* **Auth Service:** Gestiona el estado de la sesión (`isLoggedIn`) basándose en la persistencia local de datos no sensibles del usuario.
* **Interceptores:** Manejan errores `401 Unauthorized` para cerrar la sesión automáticamente si la cookie expira.
* **Guards:**
* `roleGuard`: Protege rutas a nivel macro (Admin vs Inmobiliaria).
* `permissionGuard`: Protege rutas específicas (ej: solo quien tenga `call:create` entra al Call Center).



---

<p align="center">
<small>Desarrollado para Affi - Estados Procesales</small>
</p>

