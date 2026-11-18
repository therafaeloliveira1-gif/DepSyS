import React, { useState } from 'react';
import { Coffee, Play, Pause, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { toggleGlobalPause } from '../services/api';

export default function MasterPauseControl({ isPaused, onToggleSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleConfirmToggle() {
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const res = await toggleGlobalPause();
      if (res.success) {
        onToggleSuccess(res.estado === 'PAUSADO');
      } else {
        alert('Error al cambiar estado de pausa: ' + (res.error || 'Desconocido'));
      }
    } catch (err) {
      alert('Error de red: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`py-2.5 px-4 sm:px-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
      isPaused
        ? 'bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 border-amber-300 shadow-sm ring-1 ring-amber-400/30'
        : 'bg-white border-zinc-200/90 shadow-xs'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        {/* Baliza Luminosa y Estado Compacto */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            isPaused
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 animate-bounce'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
          }`}>
            {isPaused ? <Coffee className="w-4 h-4" /> : <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
            <span className={`font-mono font-bold text-xs uppercase tracking-wider ${
              isPaused ? 'text-amber-800' : 'text-emerald-700'
            }`}>
              {isPaused ? 'Jornada Pausada' : 'Depósito en Operación'}
            </span>
            <span className="text-zinc-300 hidden sm:inline">•</span>
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
              {isPaused ? 'Cronómetros de notas congelados' : 'Operación activa en almacén'}
            </span>
          </div>
        </div>

        {/* Botón Maestro Táctico Compacto */}
        <div className="shrink-0 w-full sm:w-auto">
          {isPaused ? (
            <button
              disabled={submitting}
              onClick={() => setShowConfirm(true)}
              className="w-full sm:w-auto py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>REANUDAR OPERACIÓN</span>
            </button>
          ) : (
            <button
              disabled={submitting}
              onClick={() => setShowConfirm(true)}
              className="w-full sm:w-auto py-1.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span>PAUSAR DEPÓSITO</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Pausa Maestra */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-heading font-bold text-lg text-zinc-900 text-center mb-1.5">
              {isPaused ? '¿Reanudar el Depósito?' : '¿Pausar la Jornada del Depósito?'}
            </h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-5">
              {isPaused
                ? 'Se reanudarán todos los cronómetros de las terminales de separadores y mesas de control simultáneamente.'
                : 'Esta acción congelará inmediatamente los cronómetros de TODAS las notas en curso. Úselo para descansos, reuniones o almuerzo.'}
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmToggle}
                className={`flex-1 py-2.5 rounded-xl text-white font-heading font-bold text-xs shadow-md transition-colors ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                {isPaused ? 'Sí, Reanudar Ahora' : 'Sí, Pausar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
