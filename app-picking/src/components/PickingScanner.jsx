import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Barcode, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles,
  Send,
  Zap,
  PackageX,
  X,
  AlertCircle
} from 'lucide-react';
import ItemProgressCard from './ItemProgressCard';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { 
  playBeepSuccess, 
  playBeepError, 
  playItemCompleted, 
  playOrderCompleted 
} from '../services/audioService';
import { registrarBip, reportarFaltanteApi, fetchPedidoReal } from '../services/api';

// Textura SVG de ruido al 30% para acabado analógico sobre gradientes
const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export default function PickingScanner({ 
  pedido, 
  operario, 
  onBack, 
  onCompletePicking,
  isGlobalPaused = false
}) {
  const [items, setItems] = useState(pedido.items || []);
  const [lastScannedSku, setLastScannedSku] = useState(null);
  const [bipsTotal, setBipsTotal] = useState(pedido.total_bips_realizados || 0);
  const [elapsedMs, setElapsedMs] = useState(() => {
    const tInicio = pedido.inicio_separacion 
      ? new Date(pedido.inicio_separacion).getTime() 
      : Date.now();
    const startTs = isNaN(tInicio) ? Date.now() : tInicio;
    return Math.max(0, Date.now() - startTs);
  });
  const [flashColor, setFlashColor] = useState(null); // 'green' | 'red'
  const [manualInput, setManualInput] = useState('');
  const manualInputRef = useRef(null);

  // Auto-recarga de seguridad si el pedido se abrió antes de sincronizar ítems
  useEffect(() => {
    if ((!items || items.length === 0) && pedido && pedido.num_pedido) {
      fetchPedidoReal(pedido.num_pedido).then(res => {
        if (res && res.success && Array.isArray(res.items) && res.items.length > 0) {
          setItems(res.items);
        }
      }).catch(err => {
        console.error('Error auto-recargando ítems en PickingScanner:', err);
      });
    }
  }, [pedido]);

  // Sincronizar tiempo inicial al cambiar de nota
  useEffect(() => {
    const tInicio = pedido.inicio_separacion 
      ? new Date(pedido.inicio_separacion).getTime() 
      : Date.now();
    const startTs = isNaN(tInicio) ? Date.now() : tInicio;
    setElapsedMs(Math.max(0, Date.now() - startTs));
  }, [pedido.id, pedido.inicio_separacion]);

  // Estado para el modal de reporte de faltante
  const [faltanteModalItem, setFaltanteModalItem] = useState(null);
  const [faltanteMotivo, setFaltanteMotivo] = useState('Estante vacío');
  const [enviandoFaltante, setEnviandoFaltante] = useState(false);
  const [notificacionFlotante, setNotificacionFlotante] = useState(null);

  // Cronómetro de picking en vivo: SE CONGELA automáticamente si hay pausa global del supervisor
  useEffect(() => {
    if (isGlobalPaused) return; // Congelado durante la pausa maestra del depósito

    const timer = setInterval(() => {
      setElapsedMs(ms => ms + 50);
    }, 50);

    return () => clearInterval(timer);
  }, [isGlobalPaused]);

  const totalSecs = Math.floor(elapsedMs / 1000);
  const minDigits = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const secDigits = String(totalSecs % 60).padStart(2, '0');
  const msDigits = String(Math.floor((elapsedMs % 1000) / 10)).padStart(2, '0');

  // Sincronizar el pedido activo en localStorage para reanudar automáticamente al día siguiente
  useEffect(() => {
    try {
      localStorage.setItem('depsystem_active_pedido', JSON.stringify({
        ...pedido,
        items,
        total_bips_realizados: bipsTotal
      }));
    } catch (e) {
      console.warn('Error sincronizando active_pedido en localStorage:', e);
    }
  }, [items, bipsTotal, pedido]);

  // Totales
  const totalPiezasRequeridas = items.reduce((acc, it) => acc + it.cantidad_requerida, 0);
  const totalPiezasBipadas = items.reduce((acc, it) => acc + (it.cantidad_bipada || 0), 0);
  const totalFaltantes = items.filter(it => it.es_faltante === 1).length;

  // Un pedido se puede finalizar si cada ítem está completo O marcado como faltante
  const isOrderFinished = items.length > 0 && items.every(it => 
    (it.cantidad_bipada >= it.cantidad_requerida) || it.es_faltante === 1
  );

  const progressPercent = totalPiezasRequeridas > 0 
    ? Math.min(100, Math.round(((totalPiezasBipadas + items.filter(it => it.es_faltante === 1).reduce((a, b) => a + (b.cantidad_requerida - b.cantidad_bipada), 0)) / totalPiezasRequeridas) * 100)) 
    : 0;

  // Manejador central de escaneo láser
  async function procesarCodigoEscaneado(codigoRaw) {
    if (!codigoRaw) return;
    const cleanCode = String(codigoRaw).trim();

    // 1. Buscar coincidencia
    const targetIndex = items.findIndex(it => 
      String(it.sku).trim() === cleanCode || 
      String(it.codigo_barra).trim() === cleanCode
    );

    if (targetIndex === -1) {
      // ❌ Código incorrecto
      playBeepError();
      triggerFlash('red');
      registrarBip(pedido.id_deposito || pedido.id, operario.id, cleanCode);
      return;
    }

    const currentItem = items[targetIndex];

    // Verificar si ya está completo o marcado como faltante
    if (currentItem.cantidad_bipada >= currentItem.cantidad_requerida) {
      playBeepSuccess();
      triggerFlash('green');
      return;
    }

    // ✅ Coincidencia válida
    const newQty = (currentItem.cantidad_bipada || 0) + 1;
    const isNowComplete = newQty >= currentItem.cantidad_requerida;

    if (isNowComplete) {
      playItemCompleted();
    } else {
      playBeepSuccess();
    }
    triggerFlash('green');

    // Registrar en BD asynchronously
    registrarBip(pedido.id_deposito || pedido.id, operario.id, currentItem.sku);
    setBipsTotal(b => b + 1);
    setLastScannedSku(currentItem.sku);

    // Actualizar estado local
    setItems(prevItems => {
      const updated = [...prevItems];
      updated[targetIndex] = {
        ...updated[targetIndex],
        cantidad_bipada: newQty
      };

      // Si se completó toda la orden tras este bip, sonido de fin
      const willBeAllDone = updated.every(it => 
        (it.cantidad_bipada >= it.cantidad_requerida) || it.es_faltante === 1
      );
      if (willBeAllDone) {
        setTimeout(playOrderCompleted, 300);
      }

      return updated;
    });
  }

  // Hook del lector de código de barras físico del colector
  useBarcodeScanner({
    onScan: procesarCodigoEscaneado,
    minLength: 2
  });

  function triggerFlash(color) {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 250);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    procesarCodigoEscaneado(manualInput);
    setManualInput('');
  }

  function handleManualIncrement(item) {
    procesarCodigoEscaneado(item.sku);
  }

  function handleOpenFaltanteModal(item) {
    setFaltanteModalItem(item);
    setFaltanteMotivo('Estante vacío');
  }

  async function handleConfirmarFaltante() {
    if (!faltanteModalItem) return;
    setEnviandoFaltante(true);

    try {
      const notaId = pedido.id_deposito || pedido.id || pedido.num_pedido;
      const itemId = faltanteModalItem.id || faltanteModalItem.sku;
      const res = await reportarFaltanteApi(
        notaId, 
        itemId, 
        operario.id, 
        faltanteMotivo
      );

      if (res && res.success) {
        // Marcar localmente como faltante
        setItems(prev => prev.map(it => {
          if (it.sku === faltanteModalItem.sku) {
            return {
              ...it,
              es_faltante: 1,
              faltante_motivo: faltanteMotivo,
              faltante_aprobado: res.aprobadoAuto ? 1 : 0
            };
          }
          return it;
        }));

        // Feedback al operario
        if (res.tieneStockErp) {
          setNotificacionFlotante({
            tipo: 'alerta',
            titulo: 'Discrepancia Notificada al Supervisor',
            mensaje: `El ERP indica stock disponible (${res.stockErp} unid). El supervisor lo buscará físicamente mientras tú continuas con el resto.`
          });
        } else {
          setNotificacionFlotante({
            tipo: 'info',
            titulo: 'Faltante Aprobado en Sistema',
            mensaje: 'Stock en sistema confirmado en 0.'
          });
        }
      } else {
        alert('Error registrando faltante: ' + (res?.error || 'Error de red'));
      }
    } catch (err) {
      alert('Error de conexión reportando faltante');
    } finally {
      setEnviandoFaltante(false);
      setFaltanteModalItem(null);
      setTimeout(() => setNotificacionFlotante(null), 4500);
    }
  }

  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Ordenar: primero los pendientes, luego faltantes, al final completados
  const sortedItems = [...items].sort((a, b) => {
    const aComp = a.cantidad_bipada >= a.cantidad_requerida;
    const bComp = b.cantidad_bipada >= b.cantidad_requerida;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (a.es_faltante !== b.es_faltante) return a.es_faltante ? 1 : -1;
    return 0;
  });

  return (
    <div className={`flex flex-col h-full max-w-md mx-auto p-4 transition-colors duration-200 relative ${
      flashColor === 'green' ? 'bg-emerald-50' : flashColor === 'red' ? 'bg-red-50' : ''
    }`}>
      {/* Notificación Flotante de Faltante / ERP */}
      {notificacionFlotante && (
        <div className="fixed top-4 left-4 right-4 z-50 p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-top-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="font-bold text-xs uppercase tracking-wider text-amber-800">
                {notificacionFlotante.titulo}
              </h5>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                {notificacionFlotante.mensaje}
              </p>
            </div>
            <button 
              onClick={() => setNotificacionFlotante(null)} 
              className="text-amber-600 hover:text-amber-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Superior: Botón Volver + Cronómetro Imponente (MIN : SEC : MS) */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onBack}
          className="relative w-14 sm:w-16 self-stretch min-h-[66px] bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-2xl flex items-center justify-center shadow-[3px_4px_10px_rgba(0,0,0,0.06),-2px_-2px_6px_rgba(255,255,255,0.9)] transition-all active:scale-95 shrink-0 group"
          title="Volver a la lista de pedidos"
        >
          <ArrowLeft className="w-6 h-6 text-zinc-700 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Cronómetro Imponente 3D Neumórfico (MIN : SEC : MS) con degrade rojo y ruido 30% */}
        <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Card MIN */}
          <div className="relative overflow-hidden bg-white border border-zinc-100 rounded-2xl py-2 px-1 flex flex-col items-center justify-center shadow-[4px_6px_14px_rgba(0,0,0,0.06),-3px_-3px_8px_rgba(255,255,255,0.95)]">
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-10"
              style={{ backgroundImage: NOISE_BG }}
            />
            <span className="font-heading font-black text-2xl sm:text-3xl tracking-tight leading-none bg-gradient-to-b from-[#ff2a2a] via-[#e60000] to-[#800000] bg-clip-text text-transparent relative z-0">
              {minDigits}
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold tracking-widest text-[#cc0000]/70 uppercase mt-1 relative z-0">
              MIN
            </span>
          </div>

          {/* Card SEC */}
          <div className="relative overflow-hidden bg-white border border-zinc-100 rounded-2xl py-2 px-1 flex flex-col items-center justify-center shadow-[4px_6px_14px_rgba(0,0,0,0.06),-3px_-3px_8px_rgba(255,255,255,0.95)]">
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-10"
              style={{ backgroundImage: NOISE_BG }}
            />
            <span className="font-heading font-black text-2xl sm:text-3xl tracking-tight leading-none bg-gradient-to-b from-[#ff2a2a] via-[#e60000] to-[#800000] bg-clip-text text-transparent relative z-0">
              {secDigits}
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold tracking-widest text-[#cc0000]/70 uppercase mt-1 relative z-0">
              SEC
            </span>
          </div>

          {/* Card MS */}
          <div className="relative overflow-hidden bg-white border border-zinc-100 rounded-2xl py-2 px-1 flex flex-col items-center justify-center shadow-[4px_6px_14px_rgba(0,0,0,0.06),-3px_-3px_8px_rgba(255,255,255,0.95)]">
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-10"
              style={{ backgroundImage: NOISE_BG }}
            />
            <span className="font-heading font-black text-2xl sm:text-3xl tracking-tight leading-none bg-gradient-to-b from-[#ff2a2a] via-[#e60000] to-[#800000] bg-clip-text text-transparent relative z-0">
              {msDigits}
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold tracking-widest text-[#cc0000]/70 uppercase mt-1 relative z-0">
              MS
            </span>
          </div>
        </div>
      </div>

      {/* Info de la Nota y Cliente */}
      <div className="flex items-center justify-between px-1 mb-2.5 text-xs font-mono">
        <span className="font-black text-[#e60000] tracking-wider">
          NOTA #{pedido.num_pedido}
        </span>
        <span className="font-heading font-bold text-zinc-800 truncate max-w-[220px] text-right">
          {pedido.cliente_nombre}
        </span>
      </div>

      {/* Telemetría de Avance (Bento Card Móvil) */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-black text-zinc-900">
              {totalPiezasBipadas}
            </span>
            <span className="text-sm text-zinc-500 font-mono">
              / {totalPiezasRequeridas} piezas
            </span>
            {totalFaltantes > 0 && (
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                {totalFaltantes} faltante(s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
              {bipsTotal} bips
            </span>
            <span className="text-sm font-heading font-bold text-[#e60000]">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              totalFaltantes > 0 
                ? 'bg-gradient-to-r from-amber-500 to-emerald-500' 
                : 'bg-gradient-to-r from-[#e60000] to-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Barra de Entrada Manual / Indicador de Escáner */}
      <form onSubmit={handleManualSubmit} className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
          <Barcode className="w-4 h-4 text-[#e60000]" />
        </div>
        <input
          ref={manualInputRef}
          type="text"
          value={manualInput}
          onChange={e => setManualInput(e.target.value)}
          placeholder="Lector láser activo • O escribe SKU..."
          className="w-full pl-9 pr-14 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-mono text-sm placeholder-zinc-400 focus:outline-none focus:border-[#e60000] shadow-sm transition-colors"
        />
        <button
          type="submit"
          disabled={!manualInput.trim()}
          className="absolute inset-y-1 right-1 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-mono tap-active disabled:opacity-40"
        >
          Bip
        </button>
      </form>

      {/* Lista de Repuestos */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 mb-2">
        {sortedItems.map(item => (
          <ItemProgressCard
            key={item.id || item.sku}
            item={item}
            onManualIncrement={handleManualIncrement}
            onReportarFaltante={handleOpenFaltanteModal}
            isLastScanned={lastScannedSku === item.sku}
          />
        ))}
      </div>

      {/* Botón Flotante de Entrega a Mesa al Completar o Cierre Parcial */}
      {isOrderFinished && (
        <div className="pt-2">
          <button
            onClick={() => onCompletePicking(items)}
            className={`w-full py-4 px-6 active:scale-95 text-white font-heading font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 tap-active ${
              totalFaltantes > 0
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-[#e60000] hover:bg-[#cc0000] shadow-red-600/30 animate-bounce'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>
              {totalFaltantes > 0
                ? `ENTREGAR CON CIERRE PARCIAL (${totalFaltantes} FALTANTES)`
                : 'ENTREGAR A MESA DE CONTROL'}
            </span>
          </button>
        </div>
      )}

      {/* Modal Rápido de Confirmación de Faltante ("No Hay") */}
      {faltanteModalItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <PackageX className="w-5 h-5" />
                <h4 className="font-heading font-bold text-zinc-900 text-base">
                  Reportar Faltante ("No Hay")
                </h4>
              </div>
              <button 
                onClick={() => setFaltanteModalItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 mb-4">
              <span className="text-xs font-mono font-bold text-[#e60000] px-1.5 py-0.5 rounded bg-white border border-zinc-200">
                {faltanteModalItem.sku}
              </span>
              <p className="text-sm font-semibold text-zinc-900 mt-1.5 leading-snug">
                {faltanteModalItem.descripcion}
              </p>
              <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 font-mono">
                <span>Ubicación: {faltanteModalItem.ubicacion || 'PAS-01'}</span>
                <span>Faltan: {faltanteModalItem.cantidad_requerida - (faltanteModalItem.cantidad_bipada || 0)} unid.</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Motivo / Observación rápida:
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {['Estante vacío', 'No está en pasillo', 'Daño/Incompleto', 'Otro lugar'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFaltanteMotivo(m)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-mono border transition-all text-left ${
                      faltanteMotivo === m
                        ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={faltanteMotivo}
                onChange={e => setFaltanteMotivo(e.target.value)}
                placeholder="Escribe detalle si aplica..."
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-amber-500 font-mono"
              />
            </div>

            <p className="text-[11px] text-zinc-500 mb-4 leading-normal">
              ℹ️ Se consultará el stock en ERP (modo solo lectura). Si hay stock teórico, el supervisor recibirá una alerta de búsqueda física. Tu cronómetro continuará corriendo.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setFaltanteModalItem(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-xs font-bold tap-active transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviandoFaltante}
                onClick={handleConfirmarFaltante}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/30 tap-active disabled:opacity-50"
              >
                {enviandoFaltante ? 'Consultando...' : 'Confirmar Falta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
