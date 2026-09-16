import { useState } from "react";

type Role = "familia" | "terapeuta";
type Mode = "login" | "register";

interface Props {
  onNavigate: (screen: string) => void;
}

export default function LoginScreen({ onNavigate }: Props) {
  const [role, setRole] = useState<Role>("familia");
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-3xl">🌱</span>
          <span className="font-['Nunito'] font-800 text-2xl text-[#3D8B7A]">ConectaTem</span>
        </div>
        <p className="text-sm text-[#7A8077] italic">El puente entre el centro y tu hogar</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#DDD9D0] overflow-hidden">
        {/* Role selector */}
        <div className="flex border-b border-[#DDD9D0]">
          <button
            onClick={() => setRole("familia")}
            className={`flex-1 py-3.5 text-sm font-semibold font-['Nunito'] transition-colors ${
              role === "familia"
                ? "bg-[#EAF4F1] text-[#3D8B7A] border-b-2 border-[#3D8B7A]"
                : "text-[#7A8077] hover:bg-[#F7F5F0]"
            }`}
          >
            👨‍👩‍👧 Soy familia
          </button>
          <button
            onClick={() => setRole("terapeuta")}
            className={`flex-1 py-3.5 text-sm font-semibold font-['Nunito'] transition-colors ${
              role === "terapeuta"
                ? "bg-[#EAF4F1] text-[#3D8B7A] border-b-2 border-[#3D8B7A]"
                : "text-[#7A8077] hover:bg-[#F7F5F0]"
            }`}
          >
            🩺 Soy terapeuta
          </button>
        </div>

        <div className="p-6">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-[#EEE9E0] rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-semibold font-['Nunito'] rounded-md transition-all ${
                mode === "login"
                  ? "bg-white text-[#1E2A22] shadow-sm"
                  : "text-[#7A8077]"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-semibold font-['Nunito'] rounded-md transition-all ${
                mode === "register"
                  ? "bg-white text-[#1E2A22] shadow-sm"
                  : "text-[#7A8077]"
              }`}
            >
              Registrarse
            </button>
          </div>

          {mode === "login" ? (
            <LoginForm role={role} onNavigate={onNavigate} />
          ) : (
            <RegisterForm role={role} onNavigate={onNavigate} />
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-[#7A8077] text-center max-w-xs">
        Tus datos están protegidos de acuerdo con la normativa sanitaria y de protección de menores (RGPD).
      </p>
    </div>
  );
}

function LoginForm({ role, onNavigate }: { role: Role; onNavigate: (s: string) => void }) {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">
          Correo electrónico
        </label>
        <input
          type="email"
          placeholder={role === "familia" ? "tu@email.com" : "terapeuta@centro.es"}
          className="w-full px-4 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">
          Contraseña
        </label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
        />
      </div>
      <div className="text-right">
        <button type="button" className="text-xs text-[#3D8B7A] hover:underline">
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <button
        type="button"
        onClick={() => onNavigate(role === "familia" ? "familia" : "terapeuta")}
        className="w-full py-3 bg-[#3D8B7A] text-white font-semibold font-['Nunito'] rounded-xl hover:bg-[#2D6E5F] transition-colors active:scale-[0.98]"
      >
        Entrar
      </button>
    </form>
  );
}

function RegisterForm({ role, onNavigate }: { role: Role; onNavigate: (s: string) => void }) {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">Nombre</label>
          <input
            type="text"
            placeholder="Ana"
            className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">Apellidos</label>
          <input
            type="text"
            placeholder="García López"
            className="w-full px-3 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">Correo electrónico</label>
        <input
          type="email"
          placeholder="tu@email.com"
          className="w-full px-4 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
        />
      </div>
      {role === "terapeuta" && (
        <div>
          <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">
            Número de colegiado
          </label>
          <input
            type="text"
            placeholder="ej. 28/12345"
            className="w-full px-4 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
          />
        </div>
      )}
      {role === "terapeuta" && (
        <div>
          <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">Centro de trabajo</label>
          <input
            type="text"
            placeholder="Centro Atención Temprana Madrid"
            className="w-full px-4 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-[#1E2A22] mb-1.5">Contraseña</label>
        <input
          type="password"
          placeholder="Mínimo 8 caracteres"
          className="w-full px-4 py-2.5 rounded-xl border border-[#DDD9D0] bg-[#F7F5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D8B7A] focus:border-transparent transition-all placeholder:text-[#B0ACA5]"
        />
      </div>
      <div className="flex items-start gap-2.5 pt-1">
        <input type="checkbox" id="privacy" className="mt-0.5 accent-[#3D8B7A]" />
        <label htmlFor="privacy" className="text-xs text-[#7A8077] leading-relaxed">
          Acepto la{" "}
          <span className="text-[#3D8B7A] underline cursor-pointer">política de privacidad</span>{" "}
          y el tratamiento de datos conforme al RGPD.
        </label>
      </div>
      <button
        type="button"
        onClick={() => onNavigate(role === "familia" ? "familia" : "terapeuta")}
        className="w-full py-3 bg-[#3D8B7A] text-white font-semibold font-['Nunito'] rounded-xl hover:bg-[#2D6E5F] transition-colors active:scale-[0.98]"
      >
        Crear cuenta
      </button>
    </form>
  );
}
