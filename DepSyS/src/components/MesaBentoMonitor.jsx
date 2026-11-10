import React from 'react';
import { Layers, Package, Clock, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';

export default function MesaBentoMonitor({
  mesas,
  notas,
  onSelectMesaFilter,
  compact = false,
  hideHeader = false,
  onFullscreen
}) {
  return (
    <div className={`bg-white border border-zinc-200/90 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 ${compact ? 'p-4 sm:p-5' : ''}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#e60000] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base sm:text-lg text-zinc-900 leading-tight">
                Mesas & Bancadas de Empaque
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Carga: <span className="text-emerald-600 font-bold">Verde (0–1)</span>, <span className="text-amber-600 font-bold">Naranja (2–4)</span>, <span className="text-red-600 font-bold">Rojo (&gt;4)</span>
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
        ? "grid grid-cols-1 sm:grid-cols-2 gap-3.5" 
        : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
      }>
        {mesas.map(m => {
          const notasDeEstaMesa = notas.filter(n => 
            String(n.mesa_codigo) === String(m.codigo) && 
            !['FINALIZADO', 'LISTO_PARA_ENVIO', 'RETIRADO_MOSTRADOR', 'ENVIADO', 'CANCELADO'].includes(n.estado)
          );
          const notaRevisando = notasDeEstaMesa.find(n => n.estado === 'EN_MESA');
          const cant = notasDeEstaMesa.length;

          // Semáforo oficial
          let colorBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          let borderCard = 'border-zinc-200 hover:border-emerald-400 bg-emerald-50/10';
          let nivelTexto = 'DESPEJADA (0-1)';

          if (cant >= 2 && cant <= 4) {
            colorBadge = 'bg-amber-50 text-amber-700 border-amber-200';
            borderCard = 'border-amber-200 bg-amber-50/20 hover:border-amber-400';
            nivelTexto = 'MODERADA (2-4)';
          } else if (cant > 4) {
            colorBadge = 'bg-red-50 text-red-700 border-red-300 animate-pulse';
            borderCard = 'border-red-200 bg-red-50/30 shadow-md shadow-red-500/10 hover:border-red-400';
            nivelTexto = 'SATURADA (>4)';
          }

          return (
            <div
              key={m.codigo}
              onClick={() => onSelectMesaFilter(m.codigo)}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer tap-active flex flex-col justify-between ${borderCard}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest shrink-0">
                    BANCADA
                  </span>
                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${colorBadge}`}>
                    {nivelTexto}
                  </span>
                </div>

                <h4 className="font-heading font-black text-xl sm:text-2xl text-zinc-900">
                  Mesa {m.codigo}
                </h4>
                <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                  {m.nombre}
                </p>
              </div>

              {/* Detalle Operativo en la Mesa */}
              <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">Notas en Cola:</span>
                  <span className="font-bold text-zinc-900 text-sm">{cant}</span>
                </div>

                {notaRevisando ? (
                  <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-zinc-200/90 shadow-xs text-[11px] font-mono">
                    <p className="text-amber-700 font-bold truncate">Empacando #{notaRevisando.num_pedido}</p>
                    <p className="text-zinc-500 text-[10px] truncate">{notaRevisando.guardador_nombre || 'Conferencista'}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {cant === 0 ? 'Sin notas en cola' : `${cant} nota(s) en espera`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
