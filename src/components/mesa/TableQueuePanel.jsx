import React from 'react';
import { Package, Clock, User, Layers, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TableQueuePanel({
  mesaCodigo,
  notas = [],
  activeNota,
  onSelectNota,
  loading = false,
  onRefresh,
  isCollapsed = false,
  onToggleCollapse
}) {
  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-zinc-200/90 flex flex-col items-center py-3 flex-shrink-0 select-none justify-between transition-all duration-200">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors shadow-xs"
            title="Mostrar Cola de Bancada"
          >
            <ChevronRight className="w-4 h-4 text-zinc-700" />
          </button>
          <div className="w-6 h-6 rounded-lg bg-red-50 text-[#e60000] border border-red-200 font-mono font-black text-xs flex items-center justify-center shadow-xs">
            {notas.length}
          </div>
          <span className="[writing-mode:vertical-lr] rotate-180 text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-3">
            Cola Bancada
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
          title="Actualizar cola"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#e60000]' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 sm:w-72 md:w-80 bg-white border-r border-zinc-200/90 flex flex-col h-full flex-shrink-0 select-none transition-all duration-200">
      {/* Encabezado de la Cola */}
      <div className="p-3 sm:p-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#e60000] shrink-0" />
          <h3 className="font-heading font-black text-zinc-900 text-xs sm:text-sm truncate">
            Cola Bancada {mesaCodigo} ({notas.length})
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors tap-active"
            title="Actualizar cola"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#e60000]' : ''}`} />
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors tap-active"
              title="Ocultar barra lateral"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de Notas en Espera */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2">
        {loading && notas.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-24 rounded-2xl bg-zinc-100 animate-pulse"></div>
            ))}
          </div>
        ) : notas.length === 0 ? (
          <div className="text-center py-12 px-3 bg-zinc-50 rounded-2xl border border-zinc-200 my-3">
            <Sparkles className="w-7 h-7 text-zinc-400 mx-auto mb-1.5" />
            <h4 className="font-heading font-bold text-zinc-700 text-xs sm:text-sm">
              Bancada {mesaCodigo} Libre
            </h4>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              No hay pedidos en cola. Aparecerán aquí al recibirse de picking.
            </p>
          </div>
        ) : (
          notas.map((nota, idx) => {
            const isSelected = activeNota?.id === nota.id;
            const isRevisando = nota.estado === 'EN_MESA';
            const esMostrador = nota.es_mostrador === 1;

            return (
              <button
                type="button"
                key={nota.id}
                onClick={() => onSelectNota(nota)}
                className={`w-full text-left p-3 rounded-xl sm:rounded-2xl border transition-all tap-active ${
                  isSelected
                    ? 'bg-red-50/80 border-[#e60000] shadow-sm ring-1 ring-[#e60000]'
                    : esMostrador
                    ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                    : isRevisando
                    ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                    : 'bg-zinc-50/70 border-zinc-200 hover:bg-zinc-100/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-[#e60000]">
                      #{nota.num_pedido}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      [{idx + 1}]
                    </span>
                    {esMostrador && (
                      <span className="text-[8px] font-mono font-black uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        MOSTRADOR
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                    isRevisando
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                  }`}>
                    {nota.estado}
                  </span>
                </div>

                <h4 className="font-heading font-bold text-zinc-900 text-xs sm:text-sm line-clamp-1 leading-snug">
                  {nota.cliente_nombre}
                </h4>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-1.5 pt-1.5 border-t border-zinc-200/80">
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-zinc-400" />
                    <span>{nota.total_items} it ({nota.total_piezas} pz)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>{nota.tiempo_espera_fmt || '0m'}</span>
                  </div>
                </div>

                {nota.separador_nombre && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500 font-medium truncate">
                    <User className="w-2.5 h-2.5 text-[#e60000] shrink-0" />
                    <span className="truncate">Sep: {nota.separador_nombre}</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Pie de Panel Informativo */}
      <div className="p-2.5 border-t border-zinc-200 text-center bg-zinc-50/80">
        <p className="text-[10px] text-zinc-400 font-mono">
          Navegación con [↑] [↓]
        </p>
      </div>
    </div>
  );
}
