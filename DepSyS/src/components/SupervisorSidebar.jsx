import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  AlertTriangle, 
  CheckSquare, 
  Clock, 
  BarChart3, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Crown, 
  PauseCircle, 
  Radio, 
  Server,
  X,
  FileCheck2,
  UserCheck
} from 'lucide-react';

export default function SupervisorSidebar({
  activeView,
  onChangeView,
  esperasCount = 0,
  discrepanciasCount = 0,
  demorasCount = 0,
  pendientesCreditoCount = 0,
  porAsignarCount = 0,
  supervisorActual,
  onLogout,
  isPaused,
  mobileOpen = false,
  onCloseMobile = () => {},
  modulosPermitidos = []
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('depsys_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('depsys_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  const totalExcepciones = esperasCount + discrepanciasCount + demorasCount;

  const navItems = [
    {
      group: 'CENTRO OPERATIVO',
      items: [
        {
          id: 'ASSIGN_PICKING',
          label: 'Asignar Picking',
          icon: UserCheck,
          badge: porAsignarCount > 0 ? porAsignarCount : null,
          badgeColor: 'bg-blue-600 text-white',
          hint: 'Asignar pedidos confirmados a separadores'
        },
        {
          id: 'EXCEPCIONES',
          label: 'Bandeja Excepciones',
          icon: AlertTriangle,
          badge: totalExcepciones > 0 ? totalExcepciones : null,
          badgeColor: 'bg-red-600 text-white animate-pulse',
          hint: 'Esperas de mesa, faltantes y demoras'
        },
        {
          id: 'MESAS',
          label: 'Monitor 18 Bancadas',
          icon: Layers,
          hint: 'Carga de mesas de empaque'
        },
        {
          id: 'SEPARADORES',
          label: 'Separadores en Vivo',
          icon: Users,
          hint: 'Disponibilidad y tiempos en estanterías'
        }
      ]
    },
    {
      group: 'GESTIÓN Y CONTROL',
      items: [
        {
          id: 'CREDIT_APPROVAL',
          label: 'Pedidos ERP Crédito',
          icon: FileCheck2,
          badge: pendientesCreditoCount > 0 ? pendientesCreditoCount : null,
          badgeColor: 'bg-amber-600 text-white',
          hint: 'Revisión comercial y retenciones'
        },
        {
          id: 'STAFF',
          label: 'Personal y Bancadas',
          icon: ShieldCheck,
          hint: 'PINs, roles y asignación de mesas'
        },
        {
          id: 'REPORTS',
          label: 'Reportes y KPIs',
          icon: BarChart3,
          hint: 'Tiempos netos y productividad mensual'
        }
      ]
    }
  ];

  const filteredNavItems = (modulosPermitidos && modulosPermitidos.length > 0)
    ? navItems.map(group => ({
        ...group,
        items: group.items.filter(item => item.id === 'OVERVIEW' || modulosPermitidos.includes(item.id))
      })).filter(group => group.items.length > 0)
    : navItems;

  return (
    <>
      {/* Backdrop para móviles */}
      {mobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside 
        className={`bg-white border-r border-zinc-200/90 flex flex-col justify-between transition-all duration-300 select-none shadow-xl md:shadow-sm h-screen top-0
          fixed inset-y-0 left-0 z-50 md:sticky md:z-30
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-20' : 'md:w-64'}
          w-64 max-w-[80vw]
        `}
      >
        {/* 1. Header con Branding y Botón Contraer */}
        <div>
          <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src="/depsys-icon.svg" 
                alt="DepSyS" 
                className="w-10 h-10 rounded-2xl flex-shrink-0 object-contain shadow-md shadow-red-600/20" 
              />
              {(!collapsed || mobileOpen) && (
                <div className="truncate animate-in fade-in duration-200">
                  <div className="flex items-center gap-1">
                    <span className="font-heading font-black text-[#e60000] text-base tracking-tight">MOTOS</span>
                    <span className="font-heading font-black text-zinc-900 text-base tracking-tight">MENDES</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium tracking-wide">
                    DEPSYS • Supervisor
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleCollapse}
                className="hidden md:block p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                title={collapsed ? 'Expandir panel lateral' : 'Contraer panel lateral'}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                title="Cerrar panel lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Alerta de Pausa Activa si el depósito está pausado */}
          {isPaused && (
            <div className={`mx-3 mt-3 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 ${
              collapsed && !mobileOpen ? 'justify-center' : ''
            }`}>
              <PauseCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
              {(!collapsed || mobileOpen) && (
                <span className="text-[11px] font-bold tracking-tight truncate">
                  Jornada Pausada
                </span>
              )}
            </div>
          )}

          {/* 2. Lista de Navegación por Pantallas */}
          <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-230px)]">
            {filteredNavItems.map((sec, sIdx) => (
              <div key={sIdx}>
                {(!collapsed || mobileOpen) && (
                  <div className="px-3 mb-2 text-[10px] font-bold font-mono tracking-wider text-zinc-400 uppercase">
                    {sec.group}
                  </div>
                )}
                <div className="space-y-1">
                  {sec.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onChangeView(item.id);
                          onCloseMobile();
                        }}
                        title={collapsed ? `${item.label} (${item.hint})` : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all relative group ${
                          isActive
                            ? 'bg-[#e60000] text-white shadow-md shadow-red-600/25 font-bold'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                        } ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-800'
                        }`} />

                        {(!collapsed || mobileOpen) && (
                          <div className="flex-1 text-left truncate flex items-center justify-between">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isActive ? 'bg-white/20 text-white' : item.badgeColor
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Dot o badge flotante si está contraído y tiene alertas */}
                        {collapsed && !mobileOpen && item.badge && (
                          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

      {/* 3. Footer con Supervisor y Salida */}
      <div className="p-3 border-t border-zinc-100 bg-zinc-50/60">
        <div className={`flex items-center gap-2.5 p-2 rounded-2xl bg-white border border-zinc-200/80 ${
          collapsed ? 'justify-center p-2' : ''
        }`}>
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 text-[#e60000] flex-shrink-0 flex items-center justify-center font-bold text-xs">
            {supervisorActual?.codigo === 'SUP008' ? (
              <Crown className="w-4 h-4 text-amber-500" />
            ) : (
              supervisorActual?.nombre?.charAt(0) || 'S'
            )}
          </div>

          {!collapsed && (
            <div className="flex-1 truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 truncate">
                  {supervisorActual?.nombre || 'Supervisor'}
                </span>
                {supervisorActual?.codigo === 'SUP008' && (
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Root
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                {supervisorActual?.codigo || 'SUP'} • {supervisorActual?.rol || 'SUPERVISOR'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {!collapsed && (
          <div className="mt-2 px-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              SGLoja: Online
            </span>
            <span>DepSyS v3</span>
          </div>
        )}
      </div>
    </aside>
  </>
  );
}
