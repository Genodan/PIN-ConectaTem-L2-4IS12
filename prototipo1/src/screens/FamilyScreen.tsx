import { useState } from "react";

interface Props {
  onNavigate: (screen: string) => void;
}

const MODULOS = [
  { id: 1, emoji: "💬", titulo: "Intención Comunicativa", subtitulo: "¿Qué quiero?" },
  { id: 2, emoji: "⏱️", titulo: "El Reloj de la Calma", subtitulo: "Tiempo de espera" },
  { id: 3, emoji: "🪞", titulo: "El Espejo", subtitulo: "Imitación" },
  { id: 4, emoji: "🧸", titulo: "Manos a la Obra", subtitulo: "Juego funcional" },
  { id: 5, emoji: "🗣️", titulo: "Mis Primeras Palabras", subtitulo: "Vocabulario + gestos" },
];

type Tab = "perfil" | "practica";

export default function FamilyScreen({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>("perfil");
  const [moduloSeleccionado, setModuloSeleccionado] = useState<number | null>(null);
  const [enviado, setEnviado] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Header */}
      <header className="bg-white border-b border-[#DDD9D0] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌱</span>
          <span className="font-['Nunito'] font-800 text-lg text-[#3D8B7A]">ConectaTem</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#EAF4F1] flex items-center justify-center text-sm font-semibold text-[#3D8B7A] font-['Nunito']">
            A
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
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-[#EEE9E0] rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab("perfil")}
            className={`flex-1 py-2.5 text-sm font-semibold font-['Nunito'] rounded-lg transition-all ${
              tab === "perfil" ? "bg-white text-[#1E2A22] shadow-sm" : "text-[#7A8077]"
            }`}
          >
            👶 Perfil del niño
          </button>
          <button
            onClick={() => { setTab("practica"); setEnviado(false); }}
            className={`flex-1 py-2.5 text-sm font-semibold font-['Nunito'] rounded-lg transition-all ${
              tab === "practica" ? "bg-white text-[#1E2A22] shadow-sm" : "text-[#7A8077]"
            }`}
          >
            📹 Enviar práctica
          </button>
        </div>

        {tab === "perfil" ? (
          <PerfilNino />
        ) : enviado ? (
          <EnviadoOk onReset={() => setEnviado(false)} />
        ) : (
          <EnviarPractica
            modulos={MODULOS}
            moduloSeleccionado={moduloSeleccionado}
            setModuloSeleccionado={setModuloSeleccionado}
            onEnviar={() => setEnviado(true)}
          />
        )}
      </div>
    </div>
  );
}

function PerfilNino() {
  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="font-['Nunito'] font-700 text-xl text-[#1E2A22] mb-1">Perfil de tu hijo/a</h2>
        <p className="text-sm text-[#7A8077]">Esta información ayuda al terapeuta a personalizar el seguimiento.</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-20 h-20 rounded-full bg-[#EAF4F1] border-2 border-dashed border-[#3D8B7A] flex items-center justify-center text-3xl">
          👶
        </div>
        <button className="text-sm text-[#3D8B7A] font-semibold hover:underline">
          Añadir foto
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-4">
        <h3 className="font-['Nunito'] font-700 text-[#1E2A22] text-sm uppercase tracking-wide">Datos personales</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#7A8077] mb-1.5">Nombre</label>
            <input
              type="text"
              defaultValue="Lucas"
              className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#7A8077] mb-1.5">Apellidos</label>
            <input
              type="text"
              defaultValue="Martín G."
              className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#7A8077] mb-1.5">Fecha de nacimiento</label>
            <input
              type="date"
              defaultValue="2023-03-15"
              className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#7A8077] mb-1.5">Sexo</label>
            <select className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all">
              <option>Niño</option>
              <option>Niña</option>
              <option>Prefiero no indicar</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-4">
        <h3 className="font-['Nunito'] font-700 text-[#1E2A22] text-sm uppercase tracking-wide">Información clínica</h3>
        <div>
          <label className="block text-xs font-medium text-[#7A8077] mb-1.5">Diagnóstico / motivo de consulta</label>
          <input
            type="text"
            defaultValue="Retraso en el desarrollo del lenguaje"
            className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#7A8077] mb-1.5">Terapeuta asignado/a</label>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0]">
            <div className="w-6 h-6 rounded-full bg-[#EAF4F1] flex items-center justify-center text-xs font-semibold text-[#3D8B7A]">
              M
            </div>
            <span className="text-sm text-[#1E2A22]">Marta Rodríguez — Centro AT Madrid Norte</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#7A8077] mb-2">Hitos en progreso</label>
          <div className="flex flex-wrap gap-2">
            {["Intención Comunicativa", "El Reloj de la Calma", "El Espejo"].map((h) => (
              <span key={h} className="px-3 py-1 bg-[#EAF4F1] text-[#2D6E5F] text-xs font-semibold rounded-full font-['Nunito']">
                {h}
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#7A8077] mb-1.5">Observaciones de la familia</label>
          <textarea
            rows={3}
            defaultValue="Lucas muestra más interés por los pomperos. Esta semana ha señalado 2 veces hacia el estante."
            className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all resize-none"
          />
        </div>
      </div>

      <button className="w-full py-3 bg-[#3D8B7A] text-white font-semibold font-['Nunito'] rounded-xl hover:bg-[#2D6E5F] transition-colors">
        Guardar cambios
      </button>
    </div>
  );
}

function EnviarPractica({
  modulos,
  moduloSeleccionado,
  setModuloSeleccionado,
  onEnviar,
}: {
  modulos: typeof MODULOS;
  moduloSeleccionado: number | null;
  setModuloSeleccionado: (id: number) => void;
  onEnviar: () => void;
}) {
  const [nota, setNota] = useState("");

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="font-['Nunito'] font-700 text-xl text-[#1E2A22] mb-1">Enviar una práctica</h2>
        <p className="text-sm text-[#7A8077]">Graba a Lucas haciendo el ejercicio y mándalo a Marta para recibir feedback.</p>
      </div>

      {/* Módulo selector */}
      <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-3">
        <label className="block text-sm font-semibold text-[#1E2A22] font-['Nunito']">
          1. Selecciona el hito practicado
        </label>
        <div className="space-y-2">
          {modulos.map((m) => (
            <button
              key={m.id}
              onClick={() => setModuloSeleccionado(m.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                moduloSeleccionado === m.id
                  ? "border-[#3D8B7A] bg-[#EAF4F1]"
                  : "border-[#DDD9D0] hover:border-[#3D8B7A] hover:bg-[#F7F5F0]"
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-[#1E2A22] font-['Nunito']">{m.titulo}</div>
                <div className="text-xs text-[#7A8077]">{m.subtitulo}</div>
              </div>
              {moduloSeleccionado === m.id && (
                <span className="ml-auto text-[#3D8B7A]">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Video upload */}
      <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-3">
        <label className="block text-sm font-semibold text-[#1E2A22] font-['Nunito']">
          2. Adjunta tu vídeo
        </label>
        <div className="border-2 border-dashed border-[#DDD9D0] rounded-xl p-6 text-center hover:border-[#3D8B7A] transition-colors cursor-pointer group">
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📹</div>
          <p className="text-sm font-semibold text-[#1E2A22] font-['Nunito']">Grabar o subir vídeo</p>
          <p className="text-xs text-[#7A8077] mt-1">Máximo 2 minutos · MP4, MOV</p>
          <div className="mt-3 flex gap-2 justify-center">
            <button
              type="button"
              className="px-4 py-2 bg-[#3D8B7A] text-white text-xs font-semibold rounded-lg font-['Nunito'] hover:bg-[#2D6E5F] transition-colors"
            >
              📷 Grabar ahora
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-[#EEE9E0] text-[#1E2A22] text-xs font-semibold rounded-lg font-['Nunito'] hover:bg-[#DDD9D0] transition-colors"
            >
              📁 Elegir archivo
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7A8077]">
          <span>🔒</span>
          <span>El vídeo se sube de forma privada y encriptada. Solo Marta lo verá.</span>
        </div>
      </div>

      {/* Nota */}
      <div className="bg-white rounded-2xl border border-[#DDD9D0] p-5 space-y-3">
        <label className="block text-sm font-semibold text-[#1E2A22] font-['Nunito']">
          3. Nota para la terapeuta <span className="font-normal text-[#7A8077]">(opcional)</span>
        </label>
        <textarea
          rows={3}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: Lucas tardó mucho en señalar, pero al final lo hizo. ¿Estamos haciéndolo bien?"
          className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] transition-all resize-none placeholder:text-[#B0ACA5]"
        />
      </div>

      <button
        type="button"
        onClick={onEnviar}
        disabled={!moduloSeleccionado}
        className={`w-full py-3.5 font-semibold font-['Nunito'] rounded-xl transition-all ${
          moduloSeleccionado
            ? "bg-[#3D8B7A] text-white hover:bg-[#2D6E5F] active:scale-[0.98]"
            : "bg-[#EEE9E0] text-[#B0ACA5] cursor-not-allowed"
        }`}
      >
        Enviar práctica a Marta ✨
      </button>
    </div>
  );
}

function EnviadoOk({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="font-['Nunito'] font-800 text-2xl text-[#1E2A22] mb-2">¡Práctica enviada!</h2>
      <p className="text-sm text-[#7A8077] mb-6">
        Marta recibirá una notificación y te enviará feedback en breve. ¡Lo estáis haciendo genial!
      </p>
      <div className="inline-flex items-center gap-2 bg-[#EAF4F1] text-[#2D6E5F] px-4 py-2 rounded-full text-sm font-semibold font-['Nunito'] mb-8">
        <span>🏅</span> +1 práctica esta semana
      </div>
      <br />
      <button
        onClick={onReset}
        className="text-sm text-[#3D8B7A] font-semibold hover:underline"
      >
        Enviar otra práctica
      </button>
    </div>
  );
}
