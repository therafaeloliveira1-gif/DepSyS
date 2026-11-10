import React, { useState, useEffect } from 'react';
import SupervisorHub from './components/SupervisorHub';
import SupervisorSidebar from './components/SupervisorSidebar';
import SupervisorNavbar from './components/SupervisorNavbar';
import ErrorBoundary from './components/ErrorBoundary';
import MasterPauseControl from './components/MasterPauseControl';
import PipelineKpiBar from './components/PipelineKpiBar';
import WaitingConfirmationPanel from './components/WaitingConfirmationPanel';
import SeparadoresLiveStatus from './components/SeparadoresLiveStatus';
import MesaBentoMonitor from './components/MesaBentoMonitor';
import DelayRadarTable from './components/DelayRadarTable';
import OrderDetailModal from './components/OrderDetailModal';
import ReportsDashboard from './components/ReportsDashboard';
import DiscrepanciesPanel from './components/DiscrepanciesPanel';
import PersonalAndSecurityManager from './components/PersonalAndSecurityManager';
import SupervisorLoginScreen from './components/SupervisorLoginScreen';
import CreditApprovalPanel from './components/CreditApprovalPanel';
import PickingAssignmentPanel from './components/PickingAssignmentPanel';
import MesaTrabajoPanel from './components/MesaTrabajoPanel';
import BandejaExcepcionesPanel from './components/BandejaExcepcionesPanel';
import { 
  fetchStatus, 
  fetchMesas, 
  fetchNotas, 
  fetchEstadoGeneralSupervisor,
  fetchDiscrepancias,
  fetchDiscrepanciasRecurrentes,
  fetchPedidosConfirmados,
  fetchPedidosPendientesFirebird
} from './services/api';
import { getModulosPermitidos, tienePermiso } from './utils/permisos';

export default function App() {
  const [supervisorActual, setSupervisorActual] = useState(() => {
    try {
      const saved = localStorage.getItem('depsys_auth_supervisor');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const modulosPermitidos = getModulosPermitidos(supervisorActual);
  const esVistaUnica = modulosPermitidos.length === 1;

  const [activeView, setActiveView] = useState(() => {
    try {
      const saved = localStorage.getItem('depsys_active_view');
      const initialPermitidos = getModulosPermitidos(
        JSON.parse(localStorage.getItem('depsys_auth_supervisor') || 'null')
      );
      if (initialPermitidos.length === 1) {
        return initialPermitidos[0];
      }
      return saved && saved !== 'OVERVIEW' ? saved : 'HUB';
    } catch {
      return 'HUB';
    }
  });

  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({});
  const [mesas, setMesas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [discrepancias, setDiscrepancias] = useState([]);
  const [recurrentes, setRecurrentes] = useState([]);
  const [supervisionGeneral, setSupervisionGeneral] = useState({
    separadores: [],
    mesas: [],
    esperaConfirmacion: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [inspectedNotaId, setInspectedNotaId] = useState(null);
  const [porAsignarCount, setPorAsignarCount] = useState(0);
  const [pendientesCreditoCount, setPendientesCreditoCount] = useState(0);
  const [mesaViewMode, setMesaViewMode] = useState('MONITOR'); // 'MONITOR' | 'TRABAJO'

  // Carga inicial y refresco continuo de telemetría de depósito
  useEffect(() => {
    if (!supervisorActual) return;
    cargarDatos(true);
    const interval = setInterval(() => {
      cargarDatos(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [supervisorActual]);

  // Redirección reactiva según permisos asignados
  useEffect(() => {
    if (!supervisorActual) return;
    const permitidos = getModulosPermitidos(supervisorActual);
    if (permitidos.length === 1) {
      // Si solo tiene 1 función/módulo (ej: Distribuidor de pedidos con ASSIGN_PICKING), fijar directamente esa pantalla
      setActiveView(permitidos[0]);
    } else if (activeView !== 'HUB' && !permitidos.includes(activeView)) {
      setActiveView(permitidos.length > 0 ? permitidos[0] : 'HUB');
    }
  }, [supervisorActual]);

  function handleSelectView(view) {
    if (esVistaUnica) {
      // Si es un usuario con pantalla única restringida, no permitir salir de su módulo
      return;
    }
    const permitidos = getModulosPermitidos(supervisorActual);
    if (view !== 'HUB' && !permitidos.includes(view)) {
      return;
    }
    setActiveView(view);
    try {
      localStorage.setItem('depsys_active_view', view);
    } catch {}
  }

  function handleLogout() {
    localStorage.removeItem('depsys_auth_supervisor');
    setSupervisorActual(null);
  }

  async function cargarDatos(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const [resStatus, resMesas, resNotas, resGeneral, resDisc, resRec, resConfirmados, resPendCredito] = await Promise.all([
        fetchStatus(),
        fetchMesas(),
        fetchNotas(),
        fetchEstadoGeneralSupervisor(),
        fetchDiscrepancias(),
        fetchDiscrepanciasRecurrentes(),
        fetchPedidosConfirmados(),
        fetchPedidosPendientesFirebird(50)
      ]);

      if (resStatus.success) {
        setIsPaused(Boolean(resStatus.pausaGlobalActiva));
        setStats(resStatus.stats || {});
      }

      if (resMesas.success && resMesas.mesas) {
        setMesas(resMesas.mesas);
      }

      if (resNotas.success && resNotas.notas) {
        setNotas(resNotas.notas);
      }

      if (resGeneral.success) {
        setSupervisionGeneral(resGeneral);
      }

      if (resDisc.success && resDisc.discrepancias) {
        setDiscrepancias(resDisc.discrepancias);
      }

      if (resRec.success && resRec.recurrentes) {
        setRecurrentes(resRec.recurrentes);
      }

      if (resConfirmados.success && Array.isArray(resConfirmados.pedidos)) {
        setPorAsignarCount(resConfirmados.pedidos.length);
      }

      if (resPendCredito && resPendCredito.success && Array.isArray(resPendCredito.pedidos)) {
        setPendientesCreditoCount(resPendCredito.pedidos.length);
      }
    } catch (err) {
      console.error('Error cargando telemetría de depósito:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // Si no hay supervisor autenticado con PIN, mostrar Pantalla de Login
  if (!supervisorActual) {
    return (
      <SupervisorLoginScreen
        onLoginSuccess={(sup) => {
          setSupervisorActual(sup);
        }}
      />
    );
  }

  // Cálculos de badges en tiempo real (mismo criterio exacto que BandejaExcepcionesPanel)
  const esperasCount = supervisionGeneral.esperaConfirmacion?.length || 0;
  const discrepanciasCount = (discrepancias || []).filter(d => d.estado === 'PENDIENTE_REVISION').length;
  const demorasCount = (notas || []).filter(n => {
    if (n.estado === 'FINALIZADO') return false;
    const minBackend = Number(n.minutos_en_deposito);
    if (!Number.isNaN(minBackend) && minBackend > 0) return minBackend >= 35;
    const start = n.inicio_separacion ? new Date(n.inicio_separacion) : new Date(n.fecha_ingreso);
    return Math.floor((Date.now() - start.getTime()) / 60000) >= 35;
  }).length;

  const esKioskoMesa = supervisorActual?.rol === 'GUARDADOR' && activeView === 'MESAS';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col font-sans select-none antialiased">
      {/* 1. Barra Superior con Navegación y Botón de Retorno al Menú Principal */}
      <SupervisorNavbar
        onRefresh={() => cargarDatos(true)}
        loading={loading}
        activeView={activeView}
        onSelectView={handleSelectView}
        isPaused={isPaused}
        supervisorActual={supervisorActual}
        onLogout={handleLogout}
        onOpenPauseModal={() => setIsPaused(prev => !prev)}
        esVistaUnica={esVistaUnica}
        modulosPermitidos={modulosPermitidos}
      />

      {/* 2. Cuerpo Principal: en Pantalla Principal incluye el Menú Lateral */}
      <div className="flex-1 flex overflow-hidden">
        {!esVistaUnica && (activeView === 'HUB' || activeView === 'OVERVIEW') && (
          <SupervisorSidebar
            activeView={activeView}
            onChangeView={handleSelectView}
            esperasCount={esperasCount}
            discrepanciasCount={discrepanciasCount}
            demorasCount={demorasCount}
            pendientesCreditoCount={pendientesCreditoCount}
            porAsignarCount={porAsignarCount}
            supervisorActual={supervisorActual}
            onLogout={handleLogout}
            isPaused={isPaused}
            modulosPermitidos={modulosPermitidos}
          />
        )}

        <main className={`flex-1 overflow-hidden ${
          esKioskoMesa
            ? 'p-0 m-0 w-full h-[calc(100vh-3.5rem)] flex flex-col'
            : 'w-full p-3.5 sm:p-5 lg:p-6 space-y-6 overflow-y-auto'
        }`}>
          <ErrorBoundary onGoHome={() => !esVistaUnica && handleSelectView('HUB')} onReset={() => cargarDatos(true)}>
          {/* PANTALLA PRINCIPAL: HUB / MENÚ DE MÓDULOS */}
        {!esVistaUnica && (activeView === 'HUB' || activeView === 'OVERVIEW') && (
          <SupervisorHub
            onSelectView={handleSelectView}
            stats={stats}
            isPaused={isPaused}
            onTogglePause={(nuevoEstado) => {
              setIsPaused(nuevoEstado);
              cargarDatos(false);
            }}
            esperasCount={esperasCount}
            discrepanciasCount={discrepanciasCount}
            demorasCount={demorasCount}
            porAsignarCount={porAsignarCount}
            pendientesCreditoCount={pendientesCreditoCount}
            mesasCount={mesas.length || 18}
            mesas={mesas}
            supervisionGeneral={supervisionGeneral}
            supervisorActual={supervisorActual}
            modulosPermitidos={modulosPermitidos}
          />
        )}

          {/* PANTALLA SECTOR 1: APROBACIÓN DE CRÉDITO Y COMERCIAL (FIREBIRD) */}
          {activeView === 'CREDIT_APPROVAL' && (
            <CreditApprovalPanel
              supervisorActual={supervisorActual}
              onPedidoAprobado={() => {
                cargarDatos(false);
              }}
            />
          )}

          {/* PANTALLA SECTOR 2: ASIGNACIÓN DE PICKING EN DEPÓSITO */}
          {activeView === 'ASSIGN_PICKING' && (
            <PickingAssignmentPanel
              supervisorActual={supervisorActual}
              onAsignacionExitosa={() => {
                cargarDatos(false);
              }}
              onNavigateView={handleSelectView}
            />
          )}

          {/* PANTALLA 2: SEPARADORES (DEDICADA) */}
          {activeView === 'SEPARADORES' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SeparadoresLiveStatus
                separadores={supervisionGeneral.separadores}
                onActualizar={() => cargarDatos(false)}
              />
            </div>
          )}

          {/* PANTALLA 3: MESAS & BANCADAS (OPERATIVO PARA GUARDADORES / MONITOR PARA SUPERVISORES) */}
          {activeView === 'MESAS' && (
            esKioskoMesa ? (
              /* Kiosko Industrial a pantalla completa para Guardadores */
              <div className="w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
                <MesaTrabajoPanel
                  supervisorActual={supervisorActual}
                  isGlobalPaused={isPaused}
                />
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {esVistaUnica ? (
                  <MesaTrabajoPanel
                    supervisorActual={supervisorActual}
                    isGlobalPaused={isPaused}
                  />
                ) : (
                  /* Vista de Supervisor: Selector entre Monitor Panorámico de 18 Bancadas o Puesto Operativo */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white border border-zinc-200/90 p-2.5 rounded-2xl shadow-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMesaViewMode('MONITOR')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            mesaViewMode === 'MONITOR'
                              ? 'bg-[#e60000] text-white shadow-xs'
                              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                          }`}
                        >
                          Monitor de 18 Bancadas
                        </button>
                        <button
                          type="button"
                          onClick={() => setMesaViewMode('TRABAJO')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            mesaViewMode === 'TRABAJO'
                              ? 'bg-[#e60000] text-white shadow-xs'
                              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                          }`}
                        >
                          Terminal de Verificación (Mesa Activa)
                        </button>
                      </div>
                    </div>

                    {mesaViewMode === 'MONITOR' ? (
                      <MesaBentoMonitor
                        mesas={supervisionGeneral.mesas?.length ? supervisionGeneral.mesas : mesas}
                        notas={notas}
                        onSelectMesaFilter={(mesaCod) => {
                          localStorage.setItem('depsystem_mesa_codigo', mesaCod);
                          setMesaViewMode('TRABAJO');
                        }}
                      />
                    ) : (
                      <MesaTrabajoPanel
                        supervisorActual={supervisorActual}
                        isGlobalPaused={isPaused}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {/* VISTA CONSOLIDADA: BANDEJA UNIFICADA DE EXCEPCIONES */}
          {activeView === 'EXCEPCIONES' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <BandejaExcepcionesPanel
                esperas={supervisionGeneral.esperaConfirmacion || []}
                discrepancias={discrepancias}
                recurrentes={recurrentes}
                notas={notas}
                mesas={supervisionGeneral.mesas || mesas}
                supervisorActual={supervisorActual}
                onActualizar={() => cargarDatos(false)}
                onInspectNota={(id) => setInspectedNotaId(id)}
              />
            </div>
          )}

          {/* PANTALLA 4: BANDEJA DE CONFIRMACIONES (DEDICADA) */}
          {activeView === 'CONFIRMACIONES' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <WaitingConfirmationPanel
                esperas={supervisionGeneral.esperaConfirmacion || []}
                mesas={supervisionGeneral.mesas || mesas}
                supervisorActual={supervisorActual}
                onAccionExitosa={() => cargarDatos(false)}
              />
            </div>
          )}

          {/* PANTALLA 5: DISCREPANCIAS Y FALTANTES ERP (DEDICADA) */}
          {activeView === 'DISCREPANCIAS' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <DiscrepanciesPanel
                discrepancias={discrepancias}
                recurrentes={recurrentes}
                supervisorActual={supervisorActual}
                onActualizar={() => cargarDatos(false)}
              />
            </div>
          )}

          {/* PANTALLA 6: RADAR DE DEMORAS (DEDICADA) */}
          {activeView === 'RADAR' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <PipelineKpiBar
                stats={stats}
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
              />
              <DelayRadarTable
                notas={notas}
                filter={selectedFilter}
                onInspectNota={(id) => setInspectedNotaId(id)}
              />
            </div>
          )}

          {/* PANTALLA 7: REPORTES MENSUALES (DEDICADA) */}
          {activeView === 'REPORTS' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <ReportsDashboard />
            </div>
          )}

          {/* PANTALLA 8: PERSONAL Y SEGURIDAD (DEDICADA) */}
          {activeView === 'STAFF' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <PersonalAndSecurityManager supervisorActual={supervisorActual} />
            </div>
          )}
        </ErrorBoundary>
      </main>
      </div>

      {/* Modal de Auditoría Forense de Pedido */}
      {inspectedNotaId && (
        <OrderDetailModal
          notaId={inspectedNotaId}
          onClose={() => {
            setInspectedNotaId(null);
            cargarDatos(false);
          }}
        />
      )}
    </div>
  );
}
