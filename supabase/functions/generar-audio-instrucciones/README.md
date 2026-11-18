# generar-audio-instrucciones (UT 1406)

Edge Function que convierte en audio, con la voz de Gemini, las instrucciones que la terapeuta escribe
para la familia. Guarda el audio en el bucket privado `audios-instrucciones` y su ruta en
`tareas.instrucciones_audio`. La app lo llama sin esperar al crear la práctica; si falla, la familia
oye la voz del dispositivo (el audio es una mejora, no un requisito).

**Estado: escrita; el formato de la petición a Gemini está probado con un script aparte, la función en sí
sin desplegar ni probar.**

Modelo y voz por defecto: `gemini-3.8-flash-lite-tts` y `Leda` (elegida tras comparar voces). Se pueden
cambiar con los secretos `GEMINI_MODEL_VOZ` y `GEMINI_VOZ` sin tocar el código.

## Orden para ponerla en marcha

1. Ejecutar `supabase/migrations/20261118120000_instrucciones_audio.sql` (SQL Editor de Supabase).
   Crea la columna y el bucket. **Antes** de subir a `main` el código de la app que lee esa columna.
2. Desplegar (una vez, quien sea propietario del proyecto Supabase):

```bash
supabase login
supabase link --project-ref ynsvnfggfoiryjlshtlr
supabase secrets set GEMINI_API_KEY=<la clave, solo aquí>
supabase functions deploy generar-audio-instrucciones
```

Si `GEMINI_API_KEY` ya está guardada para `procesar-feedback`, el segundo paso de los secretos no hace falta.

## Probar

Necesita una fila en `tareas` con `instrucciones` rellenas.

```bash
curl -X POST "https://ynsvnfggfoiryjlshtlr.supabase.co/functions/v1/generar-audio-instrucciones" \
  -H "Authorization: Bearer <clave publicable de la app>" \
  -H "Content-Type: application/json" \
  -d '{"tarea_id": "<id de la tarea>"}'
```

Responde `{ "ruta": "<id>.wav" }`. Si se repite la llamada, responde `yaGenerado: true` sin gastar cuota.
