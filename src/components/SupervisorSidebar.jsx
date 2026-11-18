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
          label: 'Asignar Separador',
          icon: UserCheck,
          badge: porAsignarCount > 0 ? porAsignarCount : null,
          badgeColor: 'bg-blue-600 text-white',
          hint: 'Asignar pedidos confirmados a separadores'
        },
        {
          id: 'EXCEPCIONES',
          label: 'Confirmaciones',
          icon: AlertTriangle,
          badge: totalExcepciones > 0 ? totalExcepciones : null,
          badgeColor: 'bg-red-600 text-white animate-pulse',
          hint: 'Esperas de mesa, faltantes y demoras'
        },
        {
          id: 'MESAS',
          label: 'Mesas',
          icon: Layers,
          hint: 'Carga de mesas de empaque'
        },
        {
          id: 'SEPARADORES',
          label: 'Separadores',
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
          label: 'Aprobar Pedidos',
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
        className={`bg-white border-r border-zinc-200/90 flex flex-col transition-all duration-300 select-none shadow-2xl md:shadow-none h-full overflow-hidden flex-shrink-0
          fixed inset-y-0 left-0 z-50 md:static md:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-20' : 'md:w-64'}
          w-64 max-w-[85vw]
        `}
      >
        {/* 1. Header con Branding y Botón Contraer */}
        <div className="h-14 px-3 sm:px-4 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img 
              src="/depsys-icon.svg" 
              alt="DepSyS" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex-shrink-0 object-contain shadow-sm shadow-red-600/10" 
            />
            {(!collapsed || mobileOpen) && (
              <div className="truncate animate-in fade-in duration-200">
                <div className="flex items-center gap-1">
                  <span className="font-heading font-black text-[#e60000] text-sm tracking-tight">MOTOS</span>
                  <span className="font-heading font-black text-zinc-900 text-sm tracking-tight">MENDES</span>
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
          <div className={`mx-3 mt-2 p-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 flex-shrink-0 ${
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

        {/* 2. Lista de Navegación por Pantallas (Responsiva, compacta y con scroll suave si la altura es reducida) */}
        <nav className="flex-1 min-h-0 px-2.5 py-2 space-y-2 overflow-y-auto">
          {filteredNavItems.map((sec, sIdx) => (
            <div key={sIdx}>
              {(!collapsed || mobileOpen) && (
                <div className="px-2 mb-1 text-[10px] font-bold font-mono tracking-wider text-zinc-400 uppercase">
                  {sec.group}
                </div>
              )}
              <div className="space-y-0.5">
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
                      title={collapsed && !mobileOpen ? `${item.label} (${item.hint})` : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative group ${
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
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

        {/* 3. Footer con Supervisor, Salida y Safe Padding Inferior contra solapamiento de barra de tareas */}
        <div className="p-2 sm:p-2.5 pb-6 sm:pb-7 border-t border-zinc-100 bg-zinc-50/80 flex-shrink-0 mt-auto">
          <div className={`flex items-center gap-2 p-1.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs ${
            collapsed && !mobileOpen ? 'justify-center p-1.5' : ''
          }`}>
            <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 text-[#e60000] flex-shrink-0 flex items-center justify-center font-bold text-xs">
              {supervisorActual?.codigo === 'SUP008' ? (
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                supervisorActual?.nombre?.charAt(0) || 'S'
              )}
            </div>

            {(!collapsed || mobileOpen) && (
              <div className="flex-1 truncate min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-900 truncate">
                    {supervisorActual?.nombre || 'Supervisor'}
                  </span>
                  {supervisorActual?.codigo === 'SUP008' && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
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
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {(!collapsed || mobileOpen) && (
            <div className="mt-1 px-1 flex items-center justify-between text-[10px] font-mono text-zinc-400">
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
