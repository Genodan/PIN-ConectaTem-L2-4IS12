# ConecTEM

**El puente entre el centro de atención temprana y tu hogar.**

Proyecto de la asignatura **PIN 11574 — Proyecto de Ingeniería de Software**
(ETSINF, UPV · curso 2026/27). Grupo **L2-4IS12**.
El mismo proyecto se trabaja también en **AER 11570**.

---

## Qué es

Aplicación que conecta a las familias con el terapeuta de atención temprana **entre sesión
y sesión**, de forma asíncrona.

**El ciclo:**

1. La familia ve un **vídeo guía** del terapeuta dentro de uno de los 5 módulos
2. Practica el ejercicio en casa y **graba un clip corto** (máx. 2 min) desde la app
3. Lo envía a través de un espacio privado y cifrado
4. El terapeuta lo revisa cuando puede y responde con una **nota de voz**
5. La familia recibe las pautas y las guarda en su **historial de logros**

### Los 5 módulos de estimulación

| # | Módulo | Objetivo |
|---|---|---|
| 1 | Intención Comunicativa | Que el niño busque al adulto para pedir o compartir |
| 2 | El Reloj de la Calma | Ampliar la tolerancia a la espera |
| 3 | El Espejo | Imitación de acciones y movimientos |
| 4 | Manos a la Obra | Juego funcional con objetos |
| 5 | Mis Primeras Palabras | Vocabulario básico + gestos |

## Funcionalidad basada en IA *(requisito obligatorio de la asignatura)*

La nota de voz del terapeuta se **transcribe automáticamente** y un modelo de lenguaje la
estructura en tres bloques fijos:

> ✅ **Punto fuerte** · 🔧 **A mejorar** · 🎯 **Foco para la próxima semana**

El resumen se muestra junto al audio original y hace el historial **buscable** por módulo,
fecha o palabra clave.

**Principio de diseño, no negociable:** el resumen es una ayuda de lectura rápida.
**Nunca sustituye la nota real del terapeuta ni toma decisiones clínicas.** El profesional
conserva siempre el control y la última palabra.

## Alineación con los ODS *(requisito obligatorio)*

- **ODS 4** — Educación de calidad, meta **4.2** (desarrollo en la primera infancia)
- **ODS 3** — Salud y bienestar
- **ODS 10** — Reducción de las desigualdades (accesibilidad, pictogramas ARASAAC,
  familias no hispanohablantes)

---

## ⚠️ Reglas del repositorio

**1. Nunca datos reales de menores.** Ni fotos, ni vídeos, ni nombres, ni diagnósticos
reales — tampoco en datos de prueba, fixtures o capturas. Todo inventado, siempre.
Trabajamos con datos sanitarios de menores con diagnóstico: una vez que un archivo entra
en el historial de git, ya no se quita.

**2. Nada de claves ni tokens en el código.** Las claves van en `.env.local`, que
**nunca** se sube. La clave secreta de Supabase y la de Gemini no van ni siquiera ahí: solo
como secretos de las Edge Functions.

**3. Arquitectura consensuada.** La transparencia 10 de la asignatura lo pide
explícitamente: se puede generar código con ayuda de IA, **pero hay que supervisarlo y
entenderlo**, y debe respetar una arquitectura uniforme acordada por el equipo.

## Tecnologías

| Parte | Tecnología |
|---|---|
| App móvil y web | **React Native + Expo SDK 57** (JavaScript), navegación con **Expo Router** |
| Cámara y vídeo | `expo-camera` |
| Backend | **Supabase** (PostgreSQL, autenticación, almacenamiento, Edge Functions) — región UE |
| IA (Sprint 2) | API de **Gemini**, solo plan de pago y solo desde una Edge Function |
| Pruebas | **Jest** + React Native Testing Library (unitarias) · **Playwright** (web, end-to-end) |
| Integración continua | **GitHub Actions**: las pruebas se ejecutan en cada push a `main` |
| Despliegue | **Vercel** (versión web) · **Expo Go** (móviles, durante el desarrollo) |

## Cómo arrancar el proyecto

### 1. Requisitos (una sola vez)

- **Node.js 24 LTS.** Comprueba con `node --version` que empieza por `v24`.
  - **Mac** (con Homebrew): `brew install node@24 && brew link --force --overwrite node@24`
  - **Windows**: descarga el instalador *LTS* (versión 24) de [nodejs.org](https://nodejs.org)
    y deja marcadas las opciones por defecto. Después cierra y vuelve a abrir la terminal.
- **Git** y **VS Code**.
- En el móvil, la app **Expo Go** (App Store / Google Play).

### 2. Descargar e instalar

```bash
git clone https://github.com/Genodan/PIN-ConectaTem-L2-4IS12.git
cd PIN-ConectaTem-L2-4IS12
npm install
```

### 3. Variables de entorno

Copia `.env.example` como `.env.local` y pon los valores del proyecto Supabase
(se pasan **en privado** dentro del equipo, nunca por el repositorio).

- Mac: `cp .env.example .env.local`
- Windows (PowerShell): `Copy-Item .env.example .env.local`

Sin `.env.local` la app arranca igual, pero sin conexión a la base de datos.

### 4. Ejecutar

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca Expo. Escanea el QR con **Expo Go** (el móvil y el ordenador en la misma wifi) |
| `npm run web` | Abre la versión web en el navegador |
| `npm test` | Pruebas unitarias (Jest) |
| `npx playwright install chromium` | Descarga el navegador de pruebas (una sola vez) |
| `npm run test:e2e` | Pruebas end-to-end sobre la versión web (Playwright) |

### Estructura

```
src/app/          pantallas (cada fichero es una ruta de Expo Router)
  _layout.js      navegación principal
  index.js        inicio
  familia/        pantallas de la familia
  terapeuta/      pantallas de la terapeuta
src/components/   componentes reutilizables
src/lib/          utilidades (cliente de Supabase)
__tests__/        pruebas unitarias (Jest)
e2e/              pruebas end-to-end (Playwright)
```

> En `src/app/` **solo van pantallas**: cualquier fichero que se ponga ahí se convierte en
> una ruta. Pruebas, componentes y utilidades van fuera.

## Estado

🚧 **Sprint 0.** El esqueleto de la app ya está en marcha: navegación, pruebas automáticas
y conexión preparada con Supabase. Las pantallas de familia y terapeuta son provisionales.

| Sprint | Contenido |
|---|---|
| **0** | Idea de negocio, Buyer Persona, competidores, TAM-SAM-SOM, Lean Canvas, DAFO, backlog, modelo de dominio |
| **1** | Núcleo: módulos, envío de vídeo, panel del terapeuta. **Sin cuidar la interfaz** |
| **2** | Capa de IA: transcripción y resumen estructurado |
| **3** | Diseño de UI/UX propuesto por el equipo de BBAA + Feria de Proyectos |

## Fechas

| Cuándo | Qué |
|---|---|
| Semana del 12 de octubre de 2026 | Pitch + entrega del Sprint 0 |
| Jueves 17 de diciembre de 2026 | **Feria de Proyectos** — entrega del MVP |
| 7 de enero de 2027 | Examen |

## Equipo

Grupo L2-4IS12 · Product Owner: *(por definir)*
Profesor **Patricio Letelier** — Scrum Master y Early Adopter.
Gestión del proyecto en **Worki** · comunicación en **Teams**.
