// UT 1406 — Genera con IA el audio de las instrucciones de una práctica (Supabase Edge Function).
//
// Petición: POST application/json  { "tarea_id": "<uuid de la fila de tareas>" }
// La función NO recibe el texto: lo lee ella misma de tareas.instrucciones, así nadie puede pedirle
// que lea textos arbitrarios con la cuota del equipo.
//
// Qué hace:
//   1. Lee la tarea y su texto de instrucciones.
//   2. Pide el audio a Gemini (síntesis de voz) con una voz y un estilo fijos.
//   3. Lo sube al bucket privado «audios-instrucciones» como «<id de la tarea>.wav».
//   4. Guarda la ruta en tareas.instrucciones_audio.
//
// Si la tarea ya tiene audio, no vuelve a llamar a Gemini (cuida la cuota).
// Si algo falla, la tarea se queda sin audio y la app usa la voz del dispositivo.
//
// Secretos (nunca en el código ni en .env.local):
//   supabase secrets set GEMINI_API_KEY=...
//   (opcionales) GEMINI_MODEL_VOZ, GEMINI_VOZ
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELO_VOZ = Deno.env.get("GEMINI_MODEL_VOZ") ?? "gemini-3.8-flash-lite-tts";
const VOZ = Deno.env.get("GEMINI_VOZ") ?? "Leda";
const ESTILO = "Voz cálida, tranquila y clara, en español de España, para una familia. Ritmo pausado.";
const URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/interactions";
const BUCKET = "audios-instrucciones";
const MAX_CARACTERES = 2000; // la app limita las instrucciones a 1500; margen de seguridad

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Gemini a veces responde 503 («high demand») o 429 (cuota): son errores pasajeros, se reintenta
async function generarAudio(texto: string, intentos = 3): Promise<Uint8Array> {
  const cuerpo = {
    model: MODELO_VOZ,
    input: [
      {
        type: "user_input",
        content: [{ type: "text", text: texto, annotations: [{ type: "speech_metadata", style: ESTILO }] }],
      },
    ],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: VOZ }] },
  };

  for (let intento = 1; ; intento++) {
    const respuesta = await fetch(URL_GEMINI, {
      method: "POST",
      headers: { "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") ?? "", "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

    if (respuesta.ok) {
      const resultado = await respuesta.json();
      const pasos = (resultado.steps ?? []).filter((p: { type: string }) => p.type === "model_output");
      const audio = pasos.at(-1)?.content?.find((c: { type: string }) => c.type === "audio");
      if (!audio?.data) throw new Error("Gemini no devolvió audio");
      // Gemini devuelve el audio en base64 (WAV, 24 kHz, mono)
      return Uint8Array.from(atob(audio.data), (c) => c.charCodeAt(0));
    }

    const pasajero = respuesta.status === 503 || respuesta.status === 429;
    if (!pasajero || intento >= intentos) {
      throw new Error(`Gemini respondió ${respuesta.status}: ${(await respuesta.text()).slice(0, 300)}`);
    }
    await new Promise((resolver) => setTimeout(resolver, 2000 * intento));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  try {
    const cuerpo = await req.json().catch(() => ({}));
    const tarea_id = cuerpo.tarea_id ?? cuerpo.record?.id;
    if (typeof tarea_id !== "string" || !tarea_id) return json({ error: "Falta tarea_id" }, 400);

    const { data: tarea, error: errorTarea } = await supabase
      .from("tareas")
      .select("id, instrucciones, instrucciones_audio")
      .eq("id", tarea_id)
      .maybeSingle();
    if (errorTarea) throw new Error("Error al leer la tarea: " + errorTarea.message);
    if (!tarea) return json({ error: "No existe esa tarea" }, 404);

    const texto = (tarea.instrucciones ?? "").trim();
    if (!texto) return json({ error: "La tarea no tiene instrucciones" }, 400);
    if (texto.length > MAX_CARACTERES) return json({ error: `Instrucciones demasiado largas (máx. ${MAX_CARACTERES})` }, 413);

    // Ya generado: se devuelve lo guardado, sin gastar cuota de Gemini
    if (tarea.instrucciones_audio) return json({ ruta: tarea.instrucciones_audio, yaGenerado: true });

    const audio = await generarAudio(texto);

    const ruta = `${tarea_id}.wav`;
    const { error: errorSubida } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, audio, { contentType: "audio/wav", upsert: true });
    if (errorSubida) throw new Error("Error al subir el audio: " + errorSubida.message);

    const { error: errorGuardar } = await supabase
      .from("tareas")
      .update({ instrucciones_audio: ruta })
      .eq("id", tarea_id);
    if (errorGuardar) throw new Error("Error al guardar la ruta del audio: " + errorGuardar.message);

    return json({ ruta });
  } catch (e) {
    // El detalle se queda en los logs de la función; al cliente solo un mensaje genérico
    console.error("generar-audio-instrucciones:", e);
    return json({ error: "No se pudo generar el audio" }, 500);
  }
});
