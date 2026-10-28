// UT 1122 — Transcribe y resume con IA la nota de voz de un feedback (Supabase Edge Function).
//
// Petición: POST application/json  { "feedback_id": "<uuid de la fila de feedbacks>" }
//   (también acepta el formato de un Database Webhook de INSERT: { "record": { "id": ... } })
// La función NO recibe el audio: lo lee ella misma del bucket «feedbacks» a partir de
// feedbacks.audio_url, así nadie puede mandarle audios arbitrarios.
//
// Qué hace:
//   1. Lee la fila de feedbacks y descarga el audio de Storage.
//   2. Lo transcribe con Gemini.
//   3. Genera el resumen en tres apartados fijos (JSON) sin añadir nada que no se haya dicho.
//   4. Guarda transcripcion y resumen_estructurado en la misma fila.
//
// Si la fila ya tiene transcripción, no vuelve a llamar a Gemini (cuida la cuota).
//
// Secretos (nunca en el código ni en .env.local):
//   supabase secrets set GEMINI_API_KEY=...
//   (opcionales) GEMINI_MODEL_TRANSCRIPCION, GEMINI_MODEL_RESUMEN
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
import { GoogleGenAI, Type } from "npm:@google/genai@^2.27.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELO_TRANSCRIPCION = Deno.env.get("GEMINI_MODEL_TRANSCRIPCION") ?? "gemini-3.5-transcribe";
const MODELO_RESUMEN = Deno.env.get("GEMINI_MODEL_RESUMEN") ?? "gemini-3.5-flash";
const BUCKET = "feedbacks";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB: de sobra para una nota de voz de pocos minutos
const SIN_INDICACIONES = "Sin indicaciones";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const gemini = new GoogleGenAI({ apiKey: Deno.env.get("GEMINI_API_KEY") });
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

// La ruta guardada puede traer el prefijo «feedbacks/»; dentro del bucket va sin él
const rutaEnBucket = (audioUrl: string) => audioUrl.replace(new RegExp(`^${BUCKET}/`), "");

// Gemini a veces responde 503 («high demand») o 429 (cuota): son errores pasajeros, se reintenta
async function conReintentos<T>(operacion: () => Promise<T>, intentos = 3): Promise<T> {
  for (let intento = 1; ; intento++) {
    try {
      return await operacion();
    } catch (e) {
      const estado = (e as { status?: number }).status;
      const pasajero = estado === 503 || estado === 429;
      if (!pasajero || intento >= intentos) throw e;
      await new Promise((resolver) => setTimeout(resolver, 2000 * intento));
    }
  }
}

async function transcribir(audio: Blob): Promise<string> {
  const subido = await gemini.files.upload({
    file: audio,
    config: { mimeType: audio.type || "audio/mpeg" },
  });
  try {
    const respuesta = await conReintentos(() =>
      gemini.interactions.create({
        model: MODELO_TRANSCRIPCION,
        input: [{ type: "audio", uri: subido.uri, mime_type: subido.mimeType }],
        generation_config: { transcription_config: { language_codes: ["es-ES"], mode: "smart" } },
      })
    );
    return respuesta.output_text ?? "";
  } finally {
    // El audio no debe quedarse en los servidores de Gemini
    if (subido.name) await gemini.files.delete({ name: subido.name }).catch(() => {});
  }
}

async function resumir(transcripcion: string) {
  const prompt =
    "Eres un asistente que resume la nota de voz que una terapeuta deja a la familia de un niño. " +
    "Usa SOLO lo que dice la transcripción. No añadas consejos, diagnósticos ni datos que no aparezcan. " +
    "Escribe en español, con frases cortas y claras para la familia. " +
    `Si un apartado no se menciona en la nota, escribe exactamente «${SIN_INDICACIONES}».\n\n` +
    "Apartados:\n" +
    "- punto_fuerte: lo que ha ido bien.\n" +
    "- a_mejorar: lo que la terapeuta pide mejorar.\n" +
    "- foco_semana: el objetivo o la práctica para la próxima semana.\n\n" +
    `Transcripción:\n${transcripcion}`;

  const respuesta = await conReintentos(() =>
    gemini.models.generateContent({
      model: MODELO_RESUMEN,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            punto_fuerte: { type: Type.STRING },
            a_mejorar: { type: Type.STRING },
            foco_semana: { type: Type.STRING },
          },
          required: ["punto_fuerte", "a_mejorar", "foco_semana"],
        },
      },
    })
  );

  const bruto = JSON.parse(respuesta.text ?? "{}");
  // Si Gemini deja un apartado vacío, se muestra «Sin indicaciones»
  const limpio = (valor: unknown) =>
    typeof valor === "string" && valor.trim() ? valor.trim() : SIN_INDICACIONES;
  return {
    punto_fuerte: limpio(bruto.punto_fuerte),
    a_mejorar: limpio(bruto.a_mejorar),
    foco_semana: limpio(bruto.foco_semana),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  try {
    // Acepta { feedback_id } (llamada de la app o de curl) y el formato de un Database Webhook (record.id)
    const cuerpo = await req.json().catch(() => ({}));
    const feedback_id = cuerpo.feedback_id ?? cuerpo.record?.id;
    if (typeof feedback_id !== "string" || !feedback_id) {
      return json({ error: "Falta feedback_id" }, 400);
    }

    const { data: fila, error: errorFila } = await supabase
      .from("feedbacks")
      .select("id, audio_url, transcripcion, resumen_estructurado")
      .eq("id", feedback_id)
      .maybeSingle();
    if (errorFila) throw new Error("Error al leer el feedback: " + errorFila.message);
    if (!fila) return json({ error: "No existe ese feedback" }, 404);
    if (!fila.audio_url) return json({ error: "El feedback no tiene audio" }, 400);

    // Ya procesado: se devuelve lo guardado, sin gastar cuota de Gemini
    if (fila.transcripcion && fila.resumen_estructurado) {
      return json({ transcripcion: fila.transcripcion, resumen_estructurado: fila.resumen_estructurado, yaProcesado: true });
    }

    const guardar = async (campos: Record<string, unknown>) => {
      const { error } = await supabase.from("feedbacks").update(campos).eq("id", feedback_id);
      if (error) throw new Error("Error al guardar el resultado: " + error.message);
    };

    // Si ya hay transcripción (un intento anterior falló en el resumen) no se vuelve a transcribir
    let transcripcion: string = fila.transcripcion ?? "";
    if (!transcripcion) {
      const { data: audio, error: errorAudio } = await supabase.storage
        .from(BUCKET)
        .download(rutaEnBucket(fila.audio_url));
      if (errorAudio || !audio) {
        return json({ error: "No se pudo leer el audio: " + (errorAudio?.message ?? "sin respuesta") }, 404);
      }
      if (audio.size > MAX_BYTES) return json({ error: "El audio es demasiado grande (máx. 10 MB)" }, 413);

      transcripcion = await transcribir(audio);
      if (!transcripcion.trim()) return json({ error: "La transcripción ha salido vacía" }, 422);
      // Se guarda enseguida: si falla el resumen, la transcripción no se pierde
      await guardar({ transcripcion });
    }

    const resumen_estructurado = await resumir(transcripcion);
    await guardar({ resumen_estructurado });

    return json({ transcripcion, resumen_estructurado });
  } catch (e) {
    // El detalle se queda en los logs de la función; al cliente solo un mensaje genérico
    console.error("procesar-feedback:", e);
    return json({ error: "No se pudo procesar el feedback" }, 500);
  }
});
