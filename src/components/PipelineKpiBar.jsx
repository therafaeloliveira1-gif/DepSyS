import React from 'react';
import { Clock, Package, CheckCircle2, Layers, Search, ChevronRight } from 'lucide-react';

export default function PipelineKpiBar({ stats, selectedFilter, onSelectFilter }) {
  const cards = [
    {
      key: 'ALL',
      label: 'TOTAL PIPELINE',
      count: (stats?.pendientes || 0) + (stats?.separando || 0) + (stats?.en_mesa || 0) + (stats?.finalizados || 0),
      numberColor: 'text-zinc-900',
      icon: Layers,
      isTotal: true
    },
    {
      key: 'PENDIENTE',
      label: '1. PENDIENTES',
      count: stats?.pendientes || 0,
      numberColor: 'text-zinc-600',
      icon: Clock,
      step: 1
    },
    {
      key: 'SEPARANDO',
      label: '2. EN SEPARACIÓN',
      count: stats?.separando || 0,
      numberColor: 'text-[#e60000]',
      icon: Package,
      step: 2
    },
    {
      key: 'EN_MESA',
      label: '3. EN MESA / CONTROL',
      count: stats?.en_mesa || 0,
      numberColor: 'text-amber-600',
      icon: Layers,
      step: 3
    },
    {
      key: 'FINALIZADO',
      label: '4. LISTOS / DESPACHO',
      count: stats?.finalizados || 0,
      numberColor: 'text-emerald-600',
      icon: CheckCircle2,
      step: 4
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 select-none">
      {cards.map((c, index) => {
        const Icon = c.icon;
        const isSelected = selectedFilter === c.key;

        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelectFilter(c.key)}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative group ${
              isSelected
                ? 'bg-red-50/50 border-[#e60000] shadow-sm ring-1 ring-red-500/20'
                : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs hover:bg-zinc-50/50'
            }`}
          >
            {/* Header: Label e Ícono */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider truncate">
                {c.label}
              </span>
              <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0 group-hover:text-zinc-600 transition-colors" />
            </div>

            {/* Cifra Principal y Estado (Sin número duplicado redundante) */}
            <div className="flex items-baseline justify-between mt-0.5">
              <span className={`text-2xl font-mono font-black ${c.numberColor}`}>
                {c.count}
              </span>
              
              {c.count > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white shadow-2xs">
                  {c.count} activos
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
