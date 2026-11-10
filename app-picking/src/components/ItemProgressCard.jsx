import React from 'react';
import { CheckCircle2, MapPin, Plus, Sparkles, AlertCircle, PackageX } from 'lucide-react';

export default function ItemProgressCard({ 
  item, 
  onManualIncrement, 
  onReportarFaltante,
  isLastScanned 
}) {
  const isFaltante = item.es_faltante === 1;
  const isFaltanteAprobado = item.faltante_aprobado === 1;
  const isComplete = item.cantidad_bipada >= item.cantidad_requerida;
  const progressPercent = Math.min(100, Math.round((item.cantidad_bipada / item.cantidad_requerida) * 100));

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
        isLastScanned
          ? 'ring-2 ring-[#e60000] bg-red-50/70 scale-[1.01] shadow-sm'
          : isFaltante
          ? 'bg-amber-50/80 border-amber-300'
          : isComplete
          ? 'bg-emerald-50/60 border-emerald-200'
          : 'bg-white border-zinc-200 shadow-sm'
      }`}
    >
      {/* Barra de progreso de fondo */}
      <div
        className={`absolute bottom-0 left-0 top-0 opacity-15 transition-all duration-300 pointer-events-none ${
          isFaltante ? 'bg-amber-400' : isComplete ? 'bg-emerald-400' : 'bg-[#e60000]'
        }`}
        style={{ width: `${progressPercent}%` }}
      />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
              {item.sku}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
              <MapPin className="w-3 h-3 text-[#e60000]" />
              <span>{item.ubicacion || 'PAS-01'}</span>
            </div>
            {isLastScanned && (
              <span className="text-[10px] font-bold text-[#e60000] uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> Último bip
              </span>
            )}
            {isFaltante && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 font-mono">
                <AlertCircle className="w-2.5 h-2.5" />
                {isFaltanteAprobado ? 'Faltante Aprobado' : 'Faltante Reportado'}
              </span>
            )}
          </div>

          <h4 className={`text-sm font-semibold leading-snug line-clamp-2 ${
            isComplete ? 'text-zinc-400 line-through' : isFaltante ? 'text-amber-900' : 'text-zinc-900'
          }`}>
            {item.descripcion}
          </h4>
        </div>

        {/* Contador Numérico Grande y Botones de Acción */}
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-xl font-black ${
              isFaltante ? 'text-amber-700' : isComplete ? 'text-emerald-600' : 'text-zinc-900'
            }`}>
              {item.cantidad_bipada}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              /{item.cantidad_requerida}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1">
            {isComplete ? (
              <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : isFaltante ? (
              <div className="px-2 py-1 rounded-lg bg-amber-100 border border-amber-300 text-[11px] font-bold font-mono text-amber-800">
                NO HAY
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onReportarFaltante && onReportarFaltante(item)}
                  className="px-2 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 flex items-center gap-1 text-[11px] font-bold font-mono text-amber-800 tap-active"
                  title="Reportar falta de producto en estante"
                >
                  <PackageX className="w-3.5 h-3.5" />
                  <span>No Hay</span>
                </button>
                <button
                  type="button"
                  onClick={() => onManualIncrement(item)}
                  className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 active:scale-95 border border-zinc-200 flex items-center justify-center text-zinc-800 tap-active shadow-sm"
                  title="Sumar 1 manual si el código está dañado"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
