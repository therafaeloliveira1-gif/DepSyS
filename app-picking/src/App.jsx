import React, { useState, useEffect } from 'react';
import OperatorSelector from './components/OperatorSelector';
import OrderQueue from './components/OrderQueue';
import PickingScanner from './components/PickingScanner';
import TableDeliveryModal from './components/TableDeliveryModal';
import GlobalPauseOverlay from './components/GlobalPauseOverlay';
import { fetchStatus } from './services/api';

export default function App() {
  const [isGlobalPaused, setIsGlobalPaused] = useState(false);

  // Polling ágil (cada 2.5s) para detectar la Pausa Maestra del depósito activada por el supervisor
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await fetchStatus();
        if (isMounted && res && res.success) {
          const paused = Boolean(res.pausaGlobalActiva ?? res.pausaGlobal ?? res.isPaused);
          setIsGlobalPaused(paused);
        }
      } catch (err) {
        console.warn('Error verificando estado de pausa en App:', err);
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const [operario, setOperario] = useState(() => {
    try {
      const saved = localStorage.getItem('depsys_operario') || localStorage.getItem('depsystem_operario');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activePedido, setActivePedido] = useState(() => {
    try {
      const saved = localStorage.getItem('depsys_active_pedido') || localStorage.getItem('depsystem_active_pedido');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  function handleSelectOperator(op) {
    setOperario(op);
    try {
      localStorage.setItem('depsys_operario', JSON.stringify(op));
      localStorage.setItem('depsystem_operario', JSON.stringify(op));
    } catch (e) {
      console.warn('Could not save operator to localStorage:', e);
    }
  }

  function handleChangeOperator() {
    if (operario?.id) {
      localStorage.removeItem(`depsys_session_start_${operario.id}`);
    }
    setOperario(null);
    localStorage.removeItem('depsys_operario');
    localStorage.removeItem('depsystem_operario');
    localStorage.removeItem('depsys_active_pedido');
    localStorage.removeItem('depsystem_active_pedido');
    setActivePedido(null);
  }

  function handleStartPicking(pedidoNormalizado) {
    setActivePedido(pedidoNormalizado);
    try {
      localStorage.setItem('depsys_active_pedido', JSON.stringify(pedidoNormalizado));
      localStorage.setItem('depsystem_active_pedido', JSON.stringify(pedidoNormalizado));
    } catch (e) {
      console.warn('Could not save active pedido:', e);
    }
  }

  function handleBackToQueue() {
    if (window.confirm('¿Desea salir de esta nota? El avance quedará registrado en el sistema.')) {
      setActivePedido(null);
      localStorage.removeItem('depsys_active_pedido');
      localStorage.removeItem('depsystem_active_pedido');
      setShowDeliveryModal(false);
    }
  }

  function handleCompletePicking() {
    setShowDeliveryModal(true);
  }

  function handleDeliverySuccess() {
    setShowDeliveryModal(false);
    setActivePedido(null);
    localStorage.removeItem('depsys_active_pedido');
    localStorage.removeItem('depsystem_active_pedido');
  }

  return (
    <main className="w-full h-screen flex flex-col overflow-hidden font-sans bg-[#f8fafc] text-zinc-900">
      {/* Overlay de Pausa Global Maestra del Depósito */}
      <GlobalPauseOverlay isPaused={isGlobalPaused} />

      {/* Flujo de Pantallas */}
      {!operario ? (
        <OperatorSelector
          onSelectOperator={handleSelectOperator}
          currentOperator={operario}
        />
      ) : !activePedido ? (
        <OrderQueue
          operario={operario}
          onStartPicking={handleStartPicking}
          onChangeOperator={handleChangeOperator}
          isGlobalPaused={isGlobalPaused}
        />
      ) : (
        <PickingScanner
          pedido={activePedido}
          operario={operario}
          onBack={handleBackToQueue}
          onCompletePicking={handleCompletePicking}
          isGlobalPaused={isGlobalPaused}
        />
      )}

      {/* Modal de Entrega a Mesa al Finalizar el Picking */}
      {showDeliveryModal && activePedido && (
        <TableDeliveryModal
          pedido={activePedido}
          operario={operario}
          onClose={() => setShowDeliveryModal(false)}
          onDeliverySuccess={handleDeliverySuccess}
        />
      )}
    </main>
  );
}
