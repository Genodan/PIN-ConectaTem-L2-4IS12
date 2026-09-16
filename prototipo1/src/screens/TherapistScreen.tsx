import { useState } from "react";

interface Props {
  onNavigate: (screen: string) => void;
}

const PRACTICAS = [
  {
    id: 1,
    nino: "Lucas M.",
    edad: "3 años 6 meses",
    modulo: "💬 Intención Comunicativa",
    fecha: "Hoy, 10:23",
    nota: "Tardó mucho en señalar, pero al final lo hizo. ¿Estamos haciéndolo bien?",
    estado: "pendiente",
    avatar: "L",
  },
  {
    id: 2,
    nino: "Sofía P.",
    edad: "2 años 11 meses",
    modulo: "🪞 El Espejo",
    fecha: "Ayer, 18:45",
    nota: "",
    estado: "pendiente",
    avatar: "S",
  },
  {
    id: 3,
    nino: "Marco T.",
    edad: "4 años 1 mes",
    modulo: "⏱️ El Reloj de la Calma",
    fecha: "Lun, 09:10",
    nota: "Usamos el columpio tal como indicaste.",
    estado: "respondido",
    avatar: "M",
  },
];

type Tab = "bandeja" | "feedback";

export default function TherapistScreen({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>("bandeja");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [enviado, setEnviado] = useState(false);

  const selected = PRACTICAS.find((p) => p.id === selectedId);

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <header className="bg-white border-b border-[#DDD9D0] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌱</span>
          <span className="font-['Nunito'] font-800 text-lg text-[#3D8B7A]">ConectaTem</span>
          <span className="ml-2 px-2 py-0.5 bg-[#EAF4F1] text-[#2D6E5F] text-xs font-semibold rounded-full font-['Nunito']">
            Terapeuta
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#3D8B7A] flex items-center justify-center text-sm font-semibold text-white font-['Nunito']">
              M
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#F59C4A] rounded-full border-2 border-white text-[7px] text-white flex items-center justify-center font-bold">
              2
            </span>
          </div>
          <button
            onClick={() => onNavigate("login")}
            className="text-xs text-[#7A8077] hover:text-[#1E2A22] transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-[#EEE9E0] rounded-xl p-1 mb-6">
          <button
            onClick={() => { setTab("bandeja"); setSelectedId(null); setEnviado(false); }}
            className={`flex-1 py-2.5 text-sm font-semibold font-['Nunito'] rounded-lg transition-all ${
              tab === "bandeja" ? "bg-white text-[#1E2A22] shadow-sm" : "text-[#7A8077]"
            }`}
          >
            📥 Bandeja de entrada
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-[#F59C4A] text-white text-[10px] font-bold rounded-full">
              2
            </span>
          </button>
          <button
            onClick={() => setTab("feedback")}
            className={`flex-1 py-2.5 text-sm font-semibold font-['Nunito'] rounded-lg transition-all ${
              tab === "feedback" ? "bg-white text-[#1E2A22] shadow-sm" : "text-[#7A8077]"
            }`}
          >
            ✍️ Dar feedback
          </button>
        </div>

        {tab === "bandeja" ? (
          <BandejaEntrada
            practicas={PRACTICAS}
            onSelect={(id) => { setSelectedId(id); setTab("feedback"); setEnviado(false); }}
          />
        ) : enviado ? (
          <FeedbackEnviado onReset={() => { setTab("bandeja"); setEnviado(false); setSelectedId(null); }} />
        ) : (
          <FeedbackForm practica={selected || null} onEnviar={() => setEnviado(true)} />
        )}
      </div>
    </div>
  );
}

function BandejaEntrada({
  practicas,
  onSelect,
}: {
  practicas: typeof PRACTICAS;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="font-['Nunito'] font-700 text-xl text-[#1E2A22]">Prácticas recibidas</h2>
        <span className="text-xs text-[#7A8077]">3 prácticas</span>
      </div>

      {practicas.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="w-full bg-white rounded-2xl border border-[#DDD9D0] p-4 text-left hover:border-[#3D8B7A] hover:shadow-sm transition-all group"
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold font-['Nunito'] flex-shrink-0 ${
                p.estado === "pendiente"
                  ? "bg-[#EAF4F1] text-[#3D8B7A]"
                  : "bg-[#EEE9E0] text-[#7A8077]"
              }`}
            >
              {p.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-['Nunito'] font-700 text-[#1E2A22] text-sm">{p.nino}</span>
                <span className="text-xs text-[#7A8077]">·</span>
                <span className="text-xs text-[#7A8077]">{p.edad}</span>
                {p.estado === "pendiente" && (
                  <span className="ml-auto px-2 py-0.5 bg-[#FEF0DC] text-[#C47A1A] text-[10px] font-bold rounded-full font-['Nunito']">
                    PENDIENTE
                  </span>
                )}
                {p.estado === "respondido" && (
                  <span className="ml-auto px-2 py-0.5 bg-[#EAF4F1] text-[#2D6E5F] text-[10px] font-bold rounded-full font-['Nunito']">
                    RESPONDIDO
                  </span>
                )}
              </div>
              <div className="text-xs text-[#3D8B7A] font-semibold mb-1">{p.modulo}</div>
              {p.nota && (
                <p className="text-xs text-[#7A8077] truncate">"{p.nota}"</p>
              )}
              <div className="text-xs text-[#B0ACA5] mt-1">{p.fecha}</div>
            </div>
            <span className="text-[#DDD9D0] group-hover:text-[#3D8B7A] transition-colors text-lg flex-shrink-0">›</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function FeedbackForm({
  practica,
  onEnviar,
}: {
  practica: (typeof PRACTICAS)[0] | null;
  onEnviar: () => void;
}) {
  const [tipoFeedback, setTipoFeedback] = useState<"voz" | "checklist" | "texto">("checklist");
  const [puntoFuerte, setPuntoFuerte] = useState("");
  const [aMejorar, setAMejorar] = useState("");
  const [focoSemana, setFocoSemana] = useState("");
  const [insignia, setInsignia] = useState<string | null>(null);

  const INSIGNIAS = ["🏅 ¡Excelente imitación!", "⭐ Familia Constante", "💪 Gran esfuerzo", "🌟 Progreso increíble"];

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="font-['Nunito'] font-700 text-xl text-[#1E2A22] mb-1">Dar feedback</h2>
        {practica ? (
          <div className="flex items-center gap-2 text-sm text-[#7A8077]">
            <div className="w-5 h-5 rounded-full bg-[#EAF4F1] flex items-center justify-center text-xs font-bold text-[#3D8B7A]">
              {practica.avatar}
            </div>
            <span>{practica.nino}</span>
            <span>·</span>
            <span>{practica.modulo}</span>
          </div>
        ) : (
          <p className="text-sm text-[#7A8077]">Selecciona una práctica de la bandeja.</p>
        )}
      </div>

      {/* Vídeo placeholder */}
      {practica && (
        <div className="bg-[#1E2A22] rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
          <div className="text-center">
            <div className="text-4xl mb-2">▶️</div>
            <p className="text-white/60 text-xs">Vídeo de práctica · {practica.fecha}</p>
          </div>
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 rounded-lg text-white text-xs font-semibold">
            {practica.modulo}
          </div>
        </div>
      )}

      {practica?.nota && (
        <div className="bg-[#FEF9F0] border border-[#F5D9A8] rounded-xl px-4 py-3 text-sm text-[#7A5A1A]">
          <span className="font-semibold">Nota de la familia:</span> "{practica.nota}"
        </div>
      )}

      {/* Tipo feedback */}
      <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-4">
        <label className="block text-sm font-semibold text-[#1E2A22] font-['Nunito']">
          Tipo de feedback
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "voz", label: "🎙️", sublabel: "Nota de voz" },
            { id: "checklist", label: "✅", sublabel: "Puntos clave" },
            { id: "texto", label: "💬", sublabel: "Mensaje" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTipoFeedback(t.id as typeof tipoFeedback)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                tipoFeedback === t.id
                  ? "border-[#3D8B7A] bg-[#EAF4F1]"
                  : "border-[#DDD9D0] hover:border-[#3D8B7A]"
              }`}
            >
              <span className="text-xl">{t.label}</span>
              <span className="text-xs font-semibold text-[#1E2A22] font-['Nunito']">{t.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback content */}
      {tipoFeedback === "voz" && (
        <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-4">
          <p className="text-sm font-semibold text-[#1E2A22] font-['Nunito']">Grabar nota de voz</p>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-[#EAF4F1] border-2 border-[#3D8B7A] flex items-center justify-center cursor-pointer hover:bg-[#3D8B7A] hover:text-white transition-all group">
              <span className="text-2xl group-hover:scale-110 transition-transform">🎙️</span>
            </div>
          </div>
          <p className="text-center text-xs text-[#7A8077]">Pulsa para grabar · máx. 5 min</p>
          <div className="text-xs text-[#7A8077] flex items-center gap-1.5">
            <span>🤖</span>
            <span>La app transcribirá y estructurará tu nota automáticamente.</span>
          </div>
        </div>
      )}

      {tipoFeedback === "checklist" && (
        <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-4">
          <p className="text-sm font-semibold text-[#1E2A22] font-['Nunito'] mb-0">
            Resumen estructurado de IA
          </p>
          <p className="text-xs text-[#7A8077] -mt-1">
            Completa los tres bloques. La familia los verá en el Historial de Logros.
          </p>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#2D6E5F] mb-1.5 uppercase tracking-wide">
              <span>✅</span> Punto fuerte
            </label>
            <textarea
              rows={2}
              value={puntoFuerte}
              onChange={(e) => setPuntoFuerte(e.target.value)}
              placeholder="Ej: Lucas mantuvo el contacto visual durante 3 segundos. ¡Eso es un gran avance!"
              className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all resize-none placeholder:text-[#B0ACA5]"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#C47A1A] mb-1.5 uppercase tracking-wide">
              <span>🔧</span> A mejorar
            </label>
            <textarea
              rows={2}
              value={aMejorar}
              onChange={(e) => setAMejorar(e.target.value)}
              placeholder="Ej: Intenta bajar a la altura de sus ojos cuando esperas su respuesta."
              className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all resize-none placeholder:text-[#B0ACA5]"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#7A5A8A] mb-1.5 uppercase tracking-wide">
              <span>🎯</span> Foco para esta semana
            </label>
            <textarea
              rows={2}
              value={focoSemana}
              onChange={(e) => setFocoSemana(e.target.value)}
              placeholder="Ej: Practicar 5 minutos al día con el pompero. Espera hasta que él te mire antes de abrirlo."
              className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all resize-none placeholder:text-[#B0ACA5]"
            />
          </div>
        </div>
      )}

      {tipoFeedback === "texto" && (
        <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-3">
          <label className="block text-sm font-semibold text-[#1E2A22] font-['Nunito']">
            Mensaje a la familia
          </label>
          <textarea
            rows={5}
            placeholder="Ej: ¡Muy buen trabajo esta semana! Lucas está empezando a anticipar la rutina..."
            className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all resize-none placeholder:text-[#B0ACA5]"
          />
        </div>
      )}

      {/* Insignia */}
      <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-3">
        <label className="block text-sm font-semibold text-[#1E2A22] font-['Nunito']">
          Añadir insignia de logro <span className="font-normal text-[#7A8077]">(opcional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INSIGNIAS.map((ins) => (
            <button
              key={ins}
              onClick={() => setInsignia(insignia === ins ? null : ins)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold font-['Nunito'] border transition-all ${
                insignia === ins
                  ? "bg-[#F59C4A] text-white border-[#F59C4A]"
                  : "bg-[#F7F5F0] text-[#7A8077] border-[#DDD9D0] hover:border-[#F59C4A]"
              }`}
            >
              {ins}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onEnviar}
        disabled={!practica}
        className={`w-full py-3.5 font-semibold font-['Nunito'] rounded-xl transition-all ${
          practica
            ? "bg-[#3D8B7A] text-white hover:bg-[#2D6E5F] active:scale-[0.98]"
            : "bg-[#EEE9E0] text-[#B0ACA5] cursor-not-allowed"
        }`}
      >
        Enviar feedback a la familia
      </button>
    </div>
  );
}

function FeedbackEnviado({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="font-['Nunito'] font-800 text-2xl text-[#1E2A22] mb-2">Feedback enviado</h2>
      <p className="text-sm text-[#7A8077] mb-6">
        La familia recibirá una notificación y verá tu feedback en el Historial de Logros.
      </p>
      <button
        onClick={onReset}
        className="text-sm text-[#3D8B7A] font-semibold hover:underline"
      >
        Volver a la bandeja
      </button>
    </div>
  );
}
