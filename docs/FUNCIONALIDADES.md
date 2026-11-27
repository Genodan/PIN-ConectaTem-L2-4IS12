# Estado de las funcionalidades (nueva interfaz KAIRÓS)

Documento vivo para el equipo: qué funciona, qué es provisional, qué es solo de adorno y qué existe en el código pero **no sale en la interfaz**. Editadlo cuando cambie algo.

**Leyenda**

| Estado | Significa |
|---|---|
| ✅ Funciona | Hecho y conectado a la base de datos |
| 🟡 Provisional | Funciona, pero de forma temporal hasta que exista su pantalla o UT |
| 🎨 Adorno | Se ve (está en Figma) pero no hace nada todavía |
| 💤 Oculta | El código existe y funciona, pero no se puede llegar a ella desde la interfaz |
| ❓ Por decidir | Pendiente de hablar en el equipo |

---

## Terapeuta · Inicio

| Funcionalidad | Estado | Notas |
|---|---|---|
| «Login» simulado (elegir terapeuta) | ✅ | Se mantiene hasta que haya inicio de sesión real |
| Saludo y fecha | ✅ | |
| «Hagamos memoria»: sesiones de hoy, evidencias por revisar, pacientes activos | ✅ | |
| Evidencias por revisar (lista) | 🟡 | Al pulsar una, va a la pestaña Evidencias en general, no a esa práctica |
| Pacientes activos · «Ver ficha →» | ✅ | Abre la ficha de ese niño en Pacientes |
| Calendario + botón «Hoy» | ✅ | El día elegido decide las «Notas rápidas» |
| Sesiones de hoy | ✅ | Las sesiones solo se crean por SQL (no hay pantalla para agendarlas) |
| Notas rápidas + ventana «Notas del día» | ✅ | Una nota por sesión; también para días futuros |
| Campana (notificaciones) | 🎨 | Pendiente de las notificaciones |
| «En línea» (Figma) | ❓ | No se muestra; se está hablando |

## Terapeuta · Pacientes

| Funcionalidad | Estado | Notas |
|---|---|---|
| Listado con progreso semanal y última actividad | ✅ | Progreso semanal = prácticas hechas / asignadas esta semana (lunes a domingo) |
| Buscar por nombre o identificador | ✅ | |
| Filtros «Activos ▾» y «Todos ▾» | 🎨 | No se sabe aún qué filtran |
| Pestañas «Principales» / «Archivados» | ✅ | Archivados = niños que la terapeuta traspasó a otra; su ficha se ve en solo lectura |
| Traspasar a otra terapeuta | 🟡 | Desde el lápiz, al final. Usa una función temporal sin login (`traspasar_paciente_sin_login`); con login, pasar a `transferir_paciente` del equipo. Los traspasos anteriores a la migración no salen en «Archivados» |
| Invitar a un nuevo paciente | ✅ | Ventana encima; crea el paciente y lo asigna a la terapeuta (sin código de invitación) |
| Ficha: datos personales, contacto y tutores | ✅ | Datos inventados |
| Editar datos (lápiz) | ✅ | Ventana encima. Necesita el permiso de UPDATE por columnas de la migración `20261127140000_pacientes_ficha.sql` (el de `anon` es temporal, hasta que haya login) |
| Foto del niño | 🎨 | Se usa un avatar de Figma (siempre el mismo para cada niño); no se pueden subir fotos |
| Progreso: completadas, pendientes, sesiones atendidas | ✅ | |
| Necesidades y objetivos | ✅ | Se edita desde el lápiz |
| Notas (las 2 últimas) + «Ver todas» | ✅ | Son las notas de sus sesiones |
| Historial de tareas + «Ver todas» | ✅ | Pendiente / Por revisar / Completada. «Vencida» llegará con la UT de fecha límite |
| Asignar nueva práctica | 🟡 | Lleva a la pestaña Prácticas, sin el niño ya elegido |
| Carrusel de módulos (asignar / quitar) | ✅ | Sin módulos asignados, el niño puede trabajar todos |

## Terapeuta · Prácticas y Evidencias

| Funcionalidad | Estado | Notas |
|---|---|---|
| Pestaña Prácticas (crear práctica, gestionar módulos) | 🟡 | Pantallas de antes, hasta hacer «ENCARGAR PRÁCTICA» |
| Pestaña Evidencias (revisar y dar feedback) | 🟡 | Pantalla de antes, hasta hacer «CORREGIR PRÁCTICAS» |

---

## 💤 Funcionalidades ocultas

Existen y funcionan, pero no hay forma de llegar a ellas desde la interfaz nueva.

| Funcionalidad | Dónde está el código | Cómo llegar ahora | Notas |
|---|---|---|---|
| Asignar o transferir un paciente sin terapeuta | `src/components/AsignacionPacientes.tsx`, `obtenerPacientesParaAsignar` y `vincularPaciente` en `src/services/pacientesService.ts` | No se puede | Además, con el permiso actual (`rls-politicas.sql` no deja a la app cambiar `terapeuta_asignado_id`) fallaría al guardar. El aviso «Ya existe un paciente con ese nombre y esa familia. Búscalo en «Asignar o Transferir Paciente»…» (`MENSAJE_PACIENTE_EXISTENTE`) remite a esta función oculta. ❓ Pendiente de hablar |
| Mensajes de la terapeuta con las familias | `src/app/terapeuta/mensajes.tsx`, `src/services/mensajesService.ts` | Escribiendo la dirección `/terapeuta/mensajes?terapeutaId=<id>` | Probablemente será una pestaña de la barra inferior |
| Alta de paciente (formulario antiguo) | `src/components/AltaPaciente.tsx` | No se usa | Sustituido por la ventana «Invitar a un nuevo paciente» (mismo servicio `crearPaciente`) |
| Asignar módulos al paciente (desplegable antiguo) | `src/components/AsignacionModulosPaciente.tsx` | No se usa | Sustituido por el carrusel de módulos de la ficha (mismo servicio) |

---

## ❓ Pendiente de hablar

- **Asignar pacientes**: el «Asignar o transferir paciente» antiguo (la terapeuta se queda con un niño de otra) va al revés que el traspaso nuevo. ¿Se borra?
- **«En línea»**: qué indica y si se muestra.
- **Filtros «Activos» y «Todos»** de Pacientes: qué filtran.
