import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  RefreshCw, 
  Database, 
  PauseCircle, 
  ArrowLeft, 
  ChevronDown, 
  LogOut, 
  Crown,
  FileCheck2,
  UserCheck,
  Layers,
  Users,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react';

const MODULOS_MENU = [
  { id: 'HUB', label: 'Menú Principal (Hub)', icon: LayoutGrid },
  { id: 'ASSIGN_PICKING', label: '1. Asignar Separador', icon: UserCheck },
  { id: 'EXCEPCIONES', label: '2. Bandeja de Excepciones', icon: AlertTriangle },
  { id: 'MESAS', label: '3. Monitor de Bancadas (18)', icon: Layers },
  { id: 'CREDIT_APPROVAL', label: '4. Pedidos (ERP Créditos)', icon: FileCheck2 },
  { id: 'SEPARADORES', label: '5. Separadores en Vivo', icon: Users },
  { id: 'STAFF', label: '6. Personal & Seguridad', icon: ShieldCheck },
  { id: 'REPORTS', label: '7. Reportes y Productividad', icon: BarChart3 }
];

const VIEW_TITLES = {
  HUB: {
    title: 'Centro de Control y Supervisión',
    subtitle: 'DepSyS • Motos Mendes S.A.'
  },
  ASSIGN_PICKING: {
    title: 'Asignación de Picking y Flujo',
    subtitle: 'Distribución de pedidos confirmados y bancadas de control'
  },
  EXCEPCIONES: {
    title: 'Bandeja Unificada de Excepciones',
    subtitle: 'Resolución de demoras, esperas de mesa y faltantes de stock'
  },
  MESAS: {
    title: 'Monitor de 18 Bancadas',
    subtitle: 'Bancadas 301 a 319 y guardadores fijos'
  },
  CREDIT_APPROVAL: {
    title: 'Pedidos (Firebird ERP)',
    subtitle: 'Evaluación comercial y límite de crédito'
  },
  SEPARADORES: {
    title: 'Separadores en Vivo',
    subtitle: 'Telemetría de estanterías y tiempos netos'
  },
  CONFIRMACIONES: {
    title: 'Bandeja de Confirmaciones',
    subtitle: 'Autorizaciones inmediatas de bancadas'
  },
  DISCREPANCIAS: {
    title: 'Discrepancias y Faltantes ERP',
    subtitle: 'Auditoría de stock físico vs Firebird'
  },
  RADAR: {
    title: 'Radar de Demoras',
    subtitle: 'Monitoreo de umbrales y tiempos de ciclo'
  },
  REPORTS: {
    title: 'Reportes y Rendimiento',
    subtitle: 'Métricas de productividad y exportación CSV'
  },
  STAFF: {
    title: 'Personal y Seguridad',
    subtitle: 'Gestión de operarios, PINs y asignación de mesas'
  }
};

export default function SupervisorNavbar({ 
  onRefresh, 
  loading, 
  activeView = 'HUB',
  onSelectView,
  isPaused = false,
  supervisorActual,
  onLogout,
  onOpenPauseModal = () => {},
  esVistaUnica = false,
  modulosPermitidos = []
}) {
  const [time, setTime] = useState('');
  const [menuRapidoOpen, setMenuRapidoOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuRapidoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atajo de teclado: Escape vuelve al Menú Principal (solo si no es pantalla única restringida)
  useEffect(() => {
    function handleKeyDown(e) {
      if (!esVistaUnica && e.key === 'Escape' && activeView !== 'HUB') {
        onSelectView('HUB');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, onSelectView, esVistaUnica]);

  function updateClock() {
    const now = new Date();
    setTime(now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  const esGuardadorMesa = supervisorActual?.rol === 'GUARDADOR' && activeView === 'MESAS';
  const currentMeta = esGuardadorMesa 
    ? {
        title: `Puesto de Control • Mesa ${supervisorActual.mesa_codigo || '301'}`,
        subtitle: 'Verificación física de repuestos y cronómetro de empaque'
      }
    : (VIEW_TITLES[activeView] || {
        title: 'Control de Supervisión',
        subtitle: 'Sistema de Gestión y Telemetría DepSyS'
      });

  const isHub = activeView === 'HUB';

  if (esGuardadorMesa) {
    return (
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-md">
        {/* Identificador de Mesa Kiosko */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#e60000] text-white flex items-center justify-center font-heading font-black text-sm shadow-xs">
            M
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-black tracking-tight text-white text-base">
              BANCADA {supervisorActual?.mesa_codigo || '301'}
            </span>
          </div>
        </div>

        {/* Info Guardador, Reloj y Salir */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{time}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-800 border border-zinc-700">
            <span className="text-zinc-200 font-bold truncate max-w-[140px]">
              {supervisorActual.nombre}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({supervisorActual.codigo})
            </span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('¿Deseas cerrar el turno de esta mesa y salir?')) {
                onLogout();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-bold transition-colors tap-active"
            title="Cerrar sesión de bancada"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Turno</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 bg-white border-b border-zinc-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-xs">
      {/* Lado Izquierdo: Branding / Botón de Retorno al Menú Principal */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Branding si está en el Hub o si es pantalla única exclusiva */}
        {isHub || esVistaUnica ? (
          <div className={`flex items-center gap-2.5 ${isHub && !esVistaUnica ? 'md:hidden' : ''}`}>
            <img 
              src="/depsys-icon.svg" 
              alt="DepSyS" 
              className="w-9 h-9 rounded-xl shadow-sm object-contain" 
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-heading font-black tracking-tight text-[#e60000] text-sm">MOTOS</span>
                <span className="font-heading font-black tracking-tight text-zinc-900 text-sm">MENDES</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">DepSyS</span>
            </div>
          </div>
        ) : (
          /* Botón Destacado: Volver al Menú Principal */
          <button
            type="button"
            onClick={() => onSelectView('HUB')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100/80 text-red-700 hover:text-red-800 border border-red-200 text-xs font-heading font-bold transition-all shadow-2xs tap-active shrink-0 group"
            title="Volver al Menú Principal (o presiona Escape)"
          >
            <ArrowLeft className="w-4 h-4 text-[#e60000] transform group-hover:-translate-x-0.5 transition-transform" />
            <span>Menú Principal</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-red-200 rounded text-red-500 shadow-2xs">ESC</kbd>
          </button>
        )}

        <div className={`h-6 w-px bg-zinc-200 mx-1 hidden sm:block ${isHub && !esVistaUnica ? 'md:hidden' : ''}`}></div>

        {/* Título de la Pantalla Activa */}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-heading font-black text-zinc-900 tracking-tight flex items-center gap-2 truncate">
            <span className="truncate">{currentMeta.title}</span>
            {isPaused && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shrink-0">
                <PauseCircle className="w-3 h-3 text-amber-600 animate-pulse" />
                Pausado
              </span>
            )}
          </h1>
          {currentMeta.subtitle && (
            <p className="text-[11px] text-zinc-500 font-medium hidden lg:block truncate">
              {currentMeta.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Lado Derecho: Selector Rápido de Módulo, Reloj, Supervisor y Acciones */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono text-xs shrink-0">

        {/* Selector Rápido de Módulo (para saltar en 1 clic sin volver al Hub) */}
        {!esVistaUnica && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuRapidoOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 font-heading font-bold text-xs transition-colors tap-active"
              title="Cambiar rápido de pantalla"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#e60000]" />
              <span className="hidden md:inline">Cambiar Módulo</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${menuRapidoOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuRapidoOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-zinc-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                {MODULOS_MENU.filter(m => m.id === 'HUB' || modulosPermitidos.length === 0 || modulosPermitidos.includes(m.id)).map(mod => {
                  const Icon = mod.icon;
                  const isCurrent = activeView === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setMenuRapidoOpen(false);
                        onSelectView(mod.id);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 transition-colors ${
                        isCurrent
                          ? 'bg-red-50 text-[#e60000] font-bold'
                          : 'text-zinc-700 hover:bg-zinc-50 font-semibold'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#e60000]' : 'text-zinc-400'}`} />
                      <span className="truncate">{mod.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reloj de Turno */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xs">
          <Clock className="w-3.5 h-3.5 text-[#e60000] shrink-0" />
          <span>{time}</span>
        </div>

        {/* Botón Refrescar */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900 tap-active transition-colors shrink-0"
          title="Actualizar datos en vivo"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#e60000]' : ''}`} />
        </button>

        {/* Supervisor y Botón Salir */}
        {supervisorActual && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-zinc-200">
            <div className="hidden lg:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-zinc-900 truncate max-w-[120px]">
                {supervisorActual.nombre.split(' ')[0]}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 font-bold">
                {supervisorActual.codigo}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors tap-active"
              title="Cerrar sesión de supervisor"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
