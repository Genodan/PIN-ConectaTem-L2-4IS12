# procesar-feedback (UT 1122)

Edge Function que transcribe la nota de voz de un feedback con Gemini y guarda un resumen
en tres apartados (`punto_fuerte`, `a_mejorar`, `foco_semana`) en `feedbacks.resumen_estructurado`.

**Estado: escrita, sin desplegar ni probar.** Los nombres de modelo (`gemini-3.5-transcribe`,
`gemini-3.5-flash`) y la versión del SDK están sin verificar: se pueden cambiar con los secretos
`GEMINI_MODEL_TRANSCRIPCION` y `GEMINI_MODEL_RESUMEN` sin tocar el código.

## Desplegar (una vez, quien sea propietario del proyecto Supabase)

```bash
brew install supabase/tap/supabase
supabase login
cd progetto-pin/app
supabase link --project-ref ynsvnfggfoiryjlshtlr
supabase secrets set GEMINI_API_KEY=<la clave, solo aquí>
supabase functions deploy procesar-feedback
```

## Probar

Necesita una fila en `feedbacks` con `audio_url` apuntando a un audio del bucket `feedbacks`.

```bash
curl -X POST "https://ynsvnfggfoiryjlshtlr.supabase.co/functions/v1/procesar-feedback" \
  -H "Authorization: Bearer <clave publicable de la app>" \
  -H "Content-Type: application/json" \
  -d '{"feedback_id": "<id de la fila>"}'
```

Después, `/familia` muestra los tres apartados en la tarjeta del feedback (UT 1352).

## Cómo se dispara

La función no arranca sola. Opciones:

- **Database Webhook (recomendado):** Supabase → Database → Webhooks → tabla `feedbacks`, evento
  **INSERT** (no UPDATE: la función actualiza la fila y se llamaría a sí misma), tipo Edge Function
  `procesar-feedback`. El audio debe estar ya en Storage y `audio_url` rellenado al crear la fila.
- **Desde la app:** `supabase.functions.invoke('procesar-feedback', { body: { feedback_id } })`,
  sin esperar la respuesta (tarda 10-20 s).
- **A mano:** el `curl` de arriba.

Para repetir el proceso con la misma fila hay que vaciar antes `transcripcion` y `resumen_estructurado`.

## Decisiones

- Recibe solo `feedback_id`: lee el audio del Storage con la clave de servicio, así no se puede
  mandar audio arbitrario.
- Si la fila ya tiene transcripción y resumen, no vuelve a llamar a Gemini.
- Borra el audio de Gemini al terminar.
- Pendiente (UT aparte, Sprint 2): aprobación de la terapeuta antes de que la familia vea el resumen,
  y comprobar el usuario que llama cuando haya login real.
