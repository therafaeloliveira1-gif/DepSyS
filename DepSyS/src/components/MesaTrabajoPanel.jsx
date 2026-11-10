import React, { useState, useEffect } from 'react';
import { Layers, Settings2, RefreshCw, PauseCircle } from 'lucide-react';
import TableQueuePanel from './mesa/TableQueuePanel';
import ReviewChecklistPanel from './mesa/ReviewChecklistPanel';
import TableConfigModal from './mesa/TableConfigModal';
import OrderFinishedSuccessModal from './mesa/OrderFinishedSuccessModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { 
  fetchColaMesa, 
  fetchDetalleNota, 
  iniciarRevisionMesa, 
  finalizarRevisionMesa 
} from '../services/api';

export default function MesaTrabajoPanel({ 
  supervisorActual = null, 
  isGlobalPaused = false 
}) {
  const esGuardadorFijo = supervisorActual?.rol === 'GUARDADOR';
  const mesaAsignada = supervisorActual?.mesa_codigo || localStorage.getItem('depsystem_mesa_codigo') || '301';

  const [mesaCodigo, setMesaCodigo] = useState(mesaAsignada);

  // Sincronizar mesa automáticamente si el usuario autenticado tiene una mesa fija asignada
  useEffect(() => {
    if (supervisorActual?.mesa_codigo) {
      setMesaCodigo(supervisorActual.mesa_codigo);
      localStorage.setItem('depsystem_mesa_codigo', supervisorActual.mesa_codigo);
    }
  }, [supervisorActual?.mesa_codigo]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [colaNotas, setColaNotas] = useState([]);
  const [loadingCola, setLoadingCola] = useState(true);
  const [activeNota, setActiveNota] = useState(null);
  const [activeItems, setActiveItems] = useState([]);
  const [finishedMetrics, setFinishedMetrics] = useState(null);

  useEffect(() => {
    cargarColaMesa(true);
    const interval = setInterval(() => {
      cargarColaMesa(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [mesaCodigo]);

  async function cargarColaMesa(showLoading = false) {
    if (showLoading) setLoadingCola(true);
    try {
      const res = await fetchColaMesa(mesaCodigo);
      if (res.success && res.notas) {
        setColaNotas(res.notas);

        if (res.notas.length > 0) {
          setActiveNota(prev => {
            if (!prev) {
              cargarDetalleNota(res.notas[0]);
              return res.notas[0];
            }
            const updated = res.notas.find(n => n.id === prev.id);
            return updated || prev;
          });
        } else {
          if (!activeNota || activeNota.estado === 'FINALIZADO') {
            setActiveNota(null);
            setActiveItems([]);
          }
        }
      }
    } catch (err) {
      console.error('Error cargando cola mesa:', err);
    } finally {
      if (showLoading) setLoadingCola(false);
    }
  }

  async function cargarDetalleNota(nota) {
    setActiveNota(nota);
    try {
      const res = await fetchDetalleNota(nota.id);
      if (res.success && res.items) {
        setActiveItems(res.items);
      }
    } catch (err) {
      console.error('Error detalle nota:', err);
    }
  }

  function handleSelectMesa(codigo) {
    setMesaCodigo(codigo);
    localStorage.setItem('depsystem_mesa_codigo', codigo);
    setShowConfigModal(false);
    setActiveNota(null);
    setActiveItems([]);
  }

  async function handleStartReview(notaId) {
    const guardadorId = supervisorActual ? supervisorActual.id : null;
    try {
      const res = await iniciarRevisionMesa(notaId, guardadorId);
      if (res.success) {
        cargarColaMesa(false);
        if (activeNota) {
          setActiveNota(n => ({ ...n, estado: 'EN_MESA' }));
        }
      }
    } catch (err) {
      console.error('Error al iniciar revisión:', err);
    }
  }

  async function handleFinishReview(notaId) {
    const guardadorId = supervisorActual ? supervisorActual.id : null;
    try {
      const res = await finalizarRevisionMesa(notaId, guardadorId);
      if (res.success) {
        setFinishedMetrics(res);
      } else {
        alert('Error finalizando revisión: ' + (res.error || 'Desconocido'));
      }
    } catch (err) {
      console.error('Error al finalizar revisión:', err);
    }
  }

  function handleNextOrder() {
    setFinishedMetrics(null);
    cargarColaMesa(true);
  }

  // Atajos de teclado para operaciones sin mouse
  useKeyboardShortcuts({
    onSpace: () => {
      if (finishedMetrics) return;
      if (activeNota && activeNota.estado === 'ASIGNADO_MESA') {
        handleStartReview(activeNota.id);
      }
    },
    onEnter: () => {
      if (finishedMetrics) {
        handleNextOrder();
      } else if (activeNota && activeNota.estado === 'EN_MESA') {
        handleFinishReview(activeNota.id);
      }
    },
    onArrowUp: () => {
      if (finishedMetrics || colaNotas.length === 0) return;
      const currentIndex = colaNotas.findIndex(n => n.id === activeNota?.id);
      if (currentIndex > 0) {
        cargarDetalleNota(colaNotas[currentIndex - 1]);
      }
    },
    onArrowDown: () => {
      if (finishedMetrics || colaNotas.length === 0) return;
      const currentIndex = colaNotas.findIndex(n => n.id === activeNota?.id);
      if (currentIndex >= 0 && currentIndex < colaNotas.length - 1) {
        cargarDetalleNota(colaNotas[currentIndex + 1]);
      }
    }
  });

  return (
    <div className={`flex flex-col w-full bg-[#f8fafc] text-zinc-900 select-none overflow-hidden ${
      esGuardadorFijo ? 'h-full rounded-none border-0 shadow-none' : 'h-[calc(100vh-8.5rem)] rounded-2xl border border-zinc-200/90 shadow-sm'
    }`}>
      {/* Sub-barra de Bancada Física: Solo para Supervisores o administradores que auditan mesas */}
      {!esGuardadorFijo && (
        <div className="px-5 py-3 bg-white border-b border-zinc-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-sm text-zinc-900">
                  Terminal de Auditoría: Bancada {mesaCodigo}
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-mono"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Cambiar Bancada
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                Supervisión de empaque y cola de pedidos en vivo
              </p>
            </div>
          </div>

          {/* Alerta de Pausa */}
          {isGlobalPaused && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold font-mono">
              <PauseCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Jornada Pausada</span>
            </div>
          )}
        </div>
      )}

      {/* Cuerpo Principal de 2 Columnas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna Izquierda: Cola de Notas de la Mesa */}
        <TableQueuePanel
          mesaCodigo={mesaCodigo}
          notas={colaNotas}
          activeNota={activeNota}
          onSelectNota={cargarDetalleNota}
          loading={loadingCola}
          onRefresh={() => cargarColaMesa(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Columna Derecha: Checklist de Repuestos & Empaque */}
        <ReviewChecklistPanel
          nota={activeNota}
          items={activeItems}
          guardador={supervisorActual}
          onStartReview={handleStartReview}
          onFinishReview={handleFinishReview}
          isGlobalPaused={isGlobalPaused}
        />
      </div>

      {/* Modal de Configuración de Mesa Asignada */}
      {showConfigModal && (
        <TableConfigModal
          currentMesa={mesaCodigo}
          onSaveMesa={handleSelectMesa}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {/* Modal de Pedido Finalizado y Métricas */}
      {finishedMetrics && (
        <OrderFinishedSuccessModal
          nota={activeNota}
          metrics={finishedMetrics}
          onNextOrder={handleNextOrder}
        />
      )}
    </div>
  );
}
