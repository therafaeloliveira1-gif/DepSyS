import React from 'react';
import { Coffee, PauseCircle, ShieldAlert } from 'lucide-react';

export default function GlobalPauseOverlay({ isPaused = false }) {
  if (!isPaused) return null;

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 select-none">
      <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 mb-5 shadow-xl shadow-amber-500/20 animate-pulse">
        <Coffee className="w-10 h-10" />
      </div>

      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-mono font-bold mb-3">
        <PauseCircle className="w-4 h-4 animate-spin" />
        <span>JORNADA EN PAUSA MAESTRA</span>
      </div>

      <h2 className="font-heading font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mb-2">
        Depósito Pausado
      </h2>

      <p className="text-zinc-600 text-xs sm:text-sm max-w-sm leading-relaxed mb-6 font-medium">
        El supervisor general ha pausado la actividad del depósito por descanso o reunión.
        <br />
        <span className="text-amber-700 font-bold">
          Los cronómetros están congelados;
        </span> no se computará tiempo neto durante este intervalo.
      </p>

      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs text-zinc-500 font-mono flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>Esta pantalla se cerrará automáticamente al reanudarse el turno.</span>
      </div>
    </div>
  );
}
