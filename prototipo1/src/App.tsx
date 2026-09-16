import { useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import FamilyScreen from "./screens/FamilyScreen";
import TherapistScreen from "./screens/TherapistScreen";

type Screen = "login" | "familia" | "terapeuta";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {/* Prototype nav bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#1E2A22]/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg">
        <span className="text-[10px] text-white/40 font-['Inter'] mr-1">Prototipo</span>
        {[
          { id: "login", label: "🔐 Acceso" },
          { id: "familia", label: "👨‍👩‍👧 Familia" },
          { id: "terapeuta", label: "🩺 Terapeuta" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-['Nunito'] transition-all ${
              screen === item.id
                ? "bg-[#3D8B7A] text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {screen === "login" && <LoginScreen onNavigate={(s) => setScreen(s as Screen)} />}
      {screen === "familia" && <FamilyScreen onNavigate={(s) => setScreen(s as Screen)} />}
      {screen === "terapeuta" && <TherapistScreen onNavigate={(s) => setScreen(s as Screen)} />}
    </div>
  );
}
