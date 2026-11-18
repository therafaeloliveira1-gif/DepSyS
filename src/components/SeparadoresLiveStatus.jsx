import React, { useState } from 'react';
import { Users, UserCheck, Clock, Moon, Sun, ShieldAlert, ArrowRight } from 'lucide-react';
import { toggleHoraExtra } from '../services/api';

export default function SeparadoresLiveStatus({
  separadores = [],
  onActualizar,
  compact = false,
  hideHeader = false,
  onFullscreen
}) {
  const [loadingSepId, setLoadingSepId] = useState(null);

  async function handleToggleHoraExtra(sepId, actualEstado) {
    setLoadingSepId(sepId);
    try {
      await toggleHoraExtra({
        separadorId: sepId,
        permiteHoraExtra: !actualEstado
      });
      if (onActualizar) onActualizar();
    } catch (err) {
      console.error('Error toggling hora extra:', err);
    } finally {
      setLoadingSepId(null);
    }
  }

  const libresCount = separadores.filter(s => s.libre).length;
  const ocupadosCount = separadores.filter(s => !s.libre).length;

  return (
    <div className={`bg-white border border-zinc-200/90 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 ${compact ? 'p-4 sm:p-5' : ''}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-black text-base sm:text-lg text-zinc-900 leading-tight">
                  Separadores en Depósito
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {libresCount} LIBRE{libresCount !== 1 ? 'S' : ''}
                </span>
                {ocupadosCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {ocupadosCount} EN PICKING
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Disponibilidad y estatus de operarios en estanterías
              </p>
            </div>
          </div>
          {onFullscreen && (
            <button
              type="button"
              onClick={onFullscreen}
              className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline inline-flex items-center gap-1 tap-active"
            >
              <span>Pantalla Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className={compact 
        ? "grid grid-cols-1 sm:grid-cols-2 gap-3" 
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      }>
        {separadores.length === 0 ? (
          <div className="col-span-full py-8 text-center text-zinc-400 text-xs font-mono">
            No hay separadores activos registrados en el sistema.
          </div>
        ) : (
          separadores.map(s => {
            const isLibre = s.libre;
            const transcurrido = s.notaActual?.transcurrido_seg || 0;
            const mins = Math.floor(transcurrido / 60);
            const secs = transcurrido % 60;
            const tiempoFmt = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            return (
              <div
                key={s.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isLibre
                    ? 'bg-zinc-50/70 border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/20'
                    : 'bg-blue-50/30 border-blue-200/80 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isLibre
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {s.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-zinc-900 truncate">
                      {s.nombre}
                    </h4>
                    {isLibre ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Disponible (Sin nota)
                      </span>
                    ) : (
                      <div className="text-[11px] font-mono text-zinc-600 truncate">
                        <span className="text-amber-700 font-bold">#{s.notaActual?.num_pedido}</span>
                        <span className="mx-1 text-zinc-400">•</span>
                        <span>{tiempoFmt}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    isLibre
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {isLibre ? 'LIBRE' : 'OCUPADO'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
