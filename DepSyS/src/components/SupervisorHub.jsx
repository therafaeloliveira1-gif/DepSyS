import React from 'react';
import { 
  FileCheck2, 
  UserCheck, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2,
  Layers,
  Users,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import MasterPauseControl from './MasterPauseControl';
import PipelineKpiBar from './PipelineKpiBar';

export default function SupervisorHub({
  onSelectView,
  stats = {},
  isPaused = false,
  onTogglePause,
  esperasCount = 0,
  discrepanciasCount = 0,
  demorasCount = 0,
  porAsignarCount = 0,
  pendientesCreditoCount = 0,
  mesas = [],
  supervisionGeneral = {},
  modulosPermitidos = []
}) {
  const totalExcepciones = esperasCount + discrepanciasCount + demorasCount;

  const separadores = supervisionGeneral?.separadores || [];
  const sepLibres = separadores.filter(s => s.libre).length;
  const sepTotal = separadores.length;

  const listaMesas = supervisionGeneral?.mesas?.length ? supervisionGeneral.mesas : mesas;
  const mesasLibres = listaMesas.filter(m => !m.ocupada && (!m.notas_en_cola || Number(m.notas_en_cola) === 0)).length;
  const mesasTotal = listaMesas.length || 18;

  const accesosDirectos = [
    {
      id: 'ASSIGN_PICKING',
      title: 'Asignar Separador',
      desc: porAsignarCount > 0 ? `${porAsignarCount} pedidos listos para pasillo` : `${sepLibres} de ${sepTotal} separadores libres`,
      badge: porAsignarCount > 0 ? `${porAsignarCount} en cola` : null,
      badgeClass: 'bg-blue-600 text-white',
      icon: UserCheck,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      id: 'EXCEPCIONES',
      title: 'Bandeja de Excepciones',
      desc: totalExcepciones > 0 ? `${esperasCount} esperas • ${discrepanciasCount} faltantes • ${demorasCount} demoras` : 'Sin bloqueos activos en depósito',
      badge: totalExcepciones > 0 ? `${totalExcepciones} alertas` : null,
      badgeClass: 'bg-[#e60000] text-white animate-pulse',
      icon: AlertTriangle,
      iconBg: totalExcepciones > 0 ? 'bg-red-50 text-[#e60000] border-red-200' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
    },
    {
      id: 'MESAS',
      title: 'Monitor 18 Bancadas',
      desc: `${mesasLibres} de ${mesasTotal} bancadas despejadas`,
      badge: `${mesasTotal - mesasLibres} activas`,
      badgeClass: 'bg-zinc-100 text-zinc-700',
      icon: Layers,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200'
    },
    {
      id: 'CREDIT_APPROVAL',
      title: 'Pedidos (ERP Créditos)',
      desc: pendientesCreditoCount > 0 ? `${pendientesCreditoCount} pedidos esperando evaluación` : 'Sincronización SGLoja Firebird al día',
      badge: pendientesCreditoCount > 0 ? `${pendientesCreditoCount} nuevos` : null,
      badgeClass: 'bg-amber-500 text-white',
      icon: FileCheck2,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200'
    },
    {
      id: 'SEPARADORES',
      title: 'Separadores en Vivo',
      desc: `${sepTotal - sepLibres} recolectando en pasillos • ${sepLibres} disponibles`,
      icon: Users,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200'
    },
    {
      id: 'REPORTS',
      title: 'Reportes y KPIs',
      desc: 'Productividad mensual, tiempos netos y exportación CSV',
      icon: BarChart3,
      iconBg: 'bg-zinc-100 text-zinc-700 border-zinc-200'
    }
  ].filter(acc => !modulosPermitidos?.length || modulosPermitidos.includes(acc.id));

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 select-none max-w-5xl">
      {/* 1. Mando Maestro de Pausa Global (Compacto) */}
      <MasterPauseControl
        isPaused={isPaused}
        onToggleSuccess={onTogglePause}
      />

      {/* 2. Pipeline Global de Pedidos (Flujo Secuencial Limpio) */}
      <PipelineKpiBar
        stats={stats}
        selectedFilter="ALL"
        onSelectFilter={() => onSelectView('RADAR')}
      />

      {/* 3. Estado Operativo / Alertas Inmediatas */}
      {(totalExcepciones > 0 || porAsignarCount > 0 || pendientesCreditoCount > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Alerta de Excepciones */}
          {totalExcepciones > 0 && (
            <div 
              onClick={() => onSelectView('EXCEPCIONES')}
              className="p-4 rounded-2xl bg-red-50/90 border border-red-200 hover:border-red-300 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-[#e60000] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-red-950 truncate">
                    {totalExcepciones} Bloqueos Activos
                  </h4>
                  <p className="text-[10px] text-red-700 truncate font-mono">
                    {esperasCount} esperas • {discrepanciasCount} faltantes • {demorasCount} demoras
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
            </div>
          )}

          {/* Alerta de Pedidos por Asignar */}
          {porAsignarCount > 0 && (
            <div 
              onClick={() => onSelectView('ASSIGN_PICKING')}
              className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 hover:border-blue-300 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-blue-950 truncate">
                    {porAsignarCount} Pedidos Confirmados
                  </h4>
                  <p className="text-[10px] text-blue-700 truncate font-mono">
                    Listos para despachar a pasillo
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
          )}

          {/* Alerta de Pedidos Retenidos por Crédito */}
          {pendientesCreditoCount > 0 && (
            <div 
              onClick={() => onSelectView('CREDIT_APPROVAL')}
              className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 hover:border-amber-300 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-amber-950 truncate">
                    {pendientesCreditoCount} Retenidos por Crédito
                  </h4>
                  <p className="text-[10px] text-amber-700 truncate font-mono">
                    Pendientes de evaluación comercial
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
          )}
        </div>
      ) : (
        /* Barra de Flujo Óptimo cuando no hay incidencias */
        <div className="py-3 px-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Flujo Operativo Óptimo: Sin bloqueos ni pedidos demorados en el depósito.</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
            100% AL DÍA
          </span>
        </div>
      )}

      {/* 4. Cuadrícula de Acceso Rápido a Módulos Operativos */}
      <div className="pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accesosDirectos.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className="p-4 rounded-2xl bg-white border border-zinc-200/90 hover:border-zinc-300 shadow-xs hover:shadow-md text-left transition-all flex items-start justify-between gap-3 group tap-active"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-heading font-black text-zinc-900 group-hover:text-[#e60000] transition-colors truncate">
                        {item.title}
                      </h4>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1 font-medium">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-[#e60000] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
