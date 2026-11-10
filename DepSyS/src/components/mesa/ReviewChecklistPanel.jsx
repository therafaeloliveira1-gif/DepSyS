import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  CheckCircle2, 
  PackageCheck, 
  Clock, 
  MapPin, 
  Send, 
  Layers,
  Zap,
  Barcode,
  AlertTriangle,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  playScanSuccess, 
  playScanError, 
  playOrderComplete 
} from '../../utils/industrialAudio';

export default function ReviewChecklistPanel({
  nota,
  items = [],
  guardador,
  onStartReview,
  onFinishReview,
  isGlobalPaused = false
}) {
  // Conteo unitario de piezas por SKU: { [sku]: cantidadBipada }
  const [itemCounts, setItemCounts] = useState({});
  const [flashScreen, setFlashScreen] = useState(null); // 'green' | 'red' | null
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success' | 'error' | 'info', message: string, sku?: string }
  const [manualScanInput, setManualScanInput] = useState('');
  const [lastScannedSku, setLastScannedSku] = useState(null);

  const scanInputRef = useRef(null);

  const isRevisando = nota?.estado === 'EN_MESA';
  const isEnEspera = nota?.estado === 'ASIGNADO_MESA';

  // Inicializar estado al cambiar la nota activa
  useEffect(() => {
    if (isRevisando && !isGlobalPaused) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
    setItemCounts({});
    setFlashScreen(null);
    setScanFeedback(null);
    setLastScannedSku(null);
    setManualScanInput('');
  }, [nota?.id, nota?.estado, isGlobalPaused]);

  // Cronómetro de mesa en vivo
  useEffect(() => {
    let interval;
    if (isRunning && !isGlobalPaused) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isGlobalPaused]);

  // Auto-cerrar alertas temporales de escaneo
  useEffect(() => {
    if (scanFeedback) {
      const timer = setTimeout(() => {
        setScanFeedback(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [scanFeedback]);

  // Destello perimetral de feedback visual de escaneo
  function triggerFlash(color) {
    setFlashScreen(color);
    setTimeout(() => {
      setFlashScreen(null);
    }, 450);
  }

  // Listener Global para Pistola de Código de Barras USB / Inalámbrica (Emulación de Teclado HID)
  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTimestamp = Date.now();

    function handleWindowKeyDown(e) {
      // Si el foco está en un input que no sea el de escaneo, no interceptar
      if (e.target.tagName === 'INPUT' && e.target.id !== 'laser-scan-input') {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimestamp;
      lastKeyTimestamp = now;

      if (e.key === 'Enter') {
        const cleanCode = keyBuffer.trim();
        if (cleanCode.length > 0) {
          e.preventDefault();
          procesarBipeoLaser(cleanCode);
          keyBuffer = '';
        }
      } else if (e.key.length === 1) {
        // En pistolas láser el intervalo entre teclas es menor a 60ms. Si fue tecleo lento manual fuera del input, resetear
        if (timeDiff > 250 && document.activeElement?.id !== 'laser-scan-input') {
          keyBuffer = '';
        }
        keyBuffer += e.key;
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [nota, items, itemCounts, isRunning, isEnEspera]);

  // Función Central de Validación de Bipeo Láser (Conteo unitario de piezas)
  function procesarBipeoLaser(rawCode) {
    if (!nota || items.length === 0) return;

    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // Buscar coincidencia en la lista de repuestos
    const itemEncontrado = items.find(it => {
      const sku = (it.sku || '').trim().toUpperCase();
      const codBarra = (it.codigo_barra || '').trim().toUpperCase();
      return sku === code || (codBarra && codBarra === code);
    });

    if (itemEncontrado) {
      const targetSku = itemEncontrado.sku;
      const cantRequerida = Number(itemEncontrado.cantidad_requerida) || 1;

      // Iniciar automáticamente el cronómetro si estaba en espera
      if (isEnEspera && !isRunning) {
        onStartReview(nota.id);
        setIsRunning(true);
      }

      setLastScannedSku(targetSku);

      setItemCounts(prev => {
        const actual = prev[targetSku] || 0;

        if (actual >= cantRequerida) {
          // Ya completó todas las piezas requeridas
          playScanSuccess();
          triggerFlash('green');
          setScanFeedback({
            type: 'info',
            message: `✓ SKU ${targetSku} ya completó las ${cantRequerida} piezas requeridas`,
            sku: targetSku
          });
          return prev;
        }

        const nuevoConteo = actual + 1;
        const next = { ...prev, [targetSku]: nuevoConteo };

        playScanSuccess();
        triggerFlash('green');

        if (nuevoConteo >= cantRequerida) {
          setScanFeedback({
            type: 'success',
            message: `✓ ${targetSku} COMPLETO (${nuevoConteo}/${cantRequerida} pzas)`,
            sku: targetSku
          });
        } else {
          setScanFeedback({
            type: 'success',
            message: `✓ ${targetSku} pieza verificada (${nuevoConteo}/${cantRequerida} pzas)`,
            sku: targetSku
          });
        }

        // Si se completó el 100% de la nota completa
        const totalReq = items.reduce((acc, it) => acc + (Number(it.cantidad_requerida) || 1), 0);
        const totalVerif = items.reduce((acc, it) => {
          const c = next[it.sku] || 0;
          return acc + Math.min(c, Number(it.cantidad_requerida) || 1);
        }, 0);

        if (totalVerif >= totalReq) {
          setTimeout(() => {
            playOrderComplete();
          }, 150);
        }

        return next;
      });

      // Limpiar input manual si se usó
      setManualScanInput('');
    } else {
      // Repuesto ajeno / error de bipeo
      playScanError();
      triggerFlash('red');
      setScanFeedback({
        type: 'error',
        message: `⚠️ ¡REPUESTO AJENO! El código [${code}] NO pertenece a esta nota.`
      });
      setManualScanInput('');
    }
  }

  // Incrementar +1 pieza manual al hacer clic en cantidad o fila
  function handlePieceIncrement(sku) {
    if (isEnEspera && !isRunning) {
      onStartReview(nota.id);
      setIsRunning(true);
    }

    const item = items.find(it => it.sku === sku);
    if (!item) return;
    const req = Number(item.cantidad_requerida) || 1;

    setLastScannedSku(sku);

    setItemCounts(prev => {
      const actual = prev[sku] || 0;
      const nuevoConteo = actual >= req ? 0 : actual + 1; // Si ya está completo, resetea a 0; si no, +1
      const next = { ...prev, [sku]: nuevoConteo };

      if (nuevoConteo > 0) {
        playScanSuccess();
        triggerFlash('green');
        setScanFeedback({
          type: 'success',
          message: nuevoConteo >= req 
            ? `✓ ${sku} COMPLETO (${nuevoConteo}/${req} pzas)` 
            : `✓ ${sku} pieza contada (${nuevoConteo}/${req} pzas)`,
          sku
        });
      }

      return next;
    });
  }

  // Marcar ítem completo al 100% o desmarcar a 0 con el botón de estado rápido
  function handleQuickToggleItem(sku, targetQty) {
    if (isEnEspera && !isRunning) {
      onStartReview(nota.id);
      setIsRunning(true);
    }

    setLastScannedSku(sku);

    setItemCounts(prev => {
      const next = { ...prev, [sku]: targetQty };
      if (targetQty > 0) {
        playScanSuccess();
        triggerFlash('green');
        setScanFeedback({
          type: 'success',
          message: `✓ ${sku} marcado al 100% (${targetQty} pzas)`,
          sku
        });
      }
      return next;
    });
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (manualScanInput.trim()) {
      procesarBipeoLaser(manualScanInput.trim());
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  if (!nota) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc] select-none">
        <div className="w-20 h-20 rounded-3xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-300 mb-4 shadow-sm">
          <Layers className="w-10 h-10" />
        </div>
        <h3 className="font-heading font-black text-2xl text-zinc-800 tracking-tight">
          Bancada de Empaque Lista
        </h3>
        <p className="text-sm text-zinc-500 max-w-md mt-1.5 font-medium">
          Selecciona un pedido de la cola lateral o escanea una canasta entregada por el recolector para iniciar la verificación.
        </p>
      </div>
    );
  }

  // Cálculos de avance del empaque por piezas individuales
  const totalPiezasNota = items.reduce((acc, it) => acc + (Number(it.cantidad_requerida) || 1), 0);
  const piezasVerificadas = items.reduce((acc, it) => {
    const c = itemCounts[it.sku] || 0;
    return acc + Math.min(c, Number(it.cantidad_requerida) || 1);
  }, 0);
  
  const porcentajeAvance = totalPiezasNota > 0 ? Math.round((piezasVerificadas / totalPiezasNota) * 100) : 0;
  const allChecked = totalPiezasNota > 0 && piezasVerificadas >= totalPiezasNota;
  const esMostrador = nota.es_mostrador === 1;

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden select-none relative transition-all duration-150 ${
      flashScreen === 'green'
        ? 'ring-8 ring-emerald-500/50 bg-emerald-50/20'
        : flashScreen === 'red'
        ? 'ring-8 ring-red-500/60 bg-red-50/30'
        : ''
    }`}>
      
      {/* 1. Encabezado de Alto Impacto: Cliente, Nota y Telemetría */}
      <div className="p-4 sm:p-5 border-b border-zinc-200 bg-white flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base sm:text-lg font-mono font-black text-[#e60000] tracking-wider">
              NOTA #{nota.num_pedido}
            </span>
            {esMostrador && (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 animate-pulse">
                <Zap className="w-3.5 h-3.5 text-amber-700" />
                MOSTRADOR (URGENTE)
              </span>
            )}
            <span className="text-xs text-zinc-500 font-mono">
              • Cliente: <strong className="text-zinc-800">{nota.cliente_codigo || 'SGLOJA'}</strong>
            </span>
          </div>

          <h2 className="font-heading font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight leading-tight">
            {nota.cliente_nombre}
          </h2>

          {nota.cliente_ciudad && (
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 font-mono font-medium">
              <MapPin className="w-4 h-4 text-[#e60000]" />
              <span>{nota.cliente_ciudad}</span>
            </p>
          )}
        </div>

        {/* Telemetría: Tiempos y Cronómetro Gigante */}
        <div className="flex items-center gap-3">
          {/* Tiempo Picking */}
          <div className="px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-right">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Tiempo Picking</p>
            <p className="font-mono font-black text-base text-zinc-800">
              {nota.tiempo_separacion_fmt || '00:00:00'}
            </p>
            <p className="text-[11px] text-zinc-500 truncate max-w-[130px] font-medium">
              Por {nota.separador_nombre || 'Separador'}
            </p>
          </div>

          {/* Cronómetro Activo de Revisión de Mesa */}
          <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-3.5 ${
            isRevisando
              ? 'bg-red-50/80 border-red-300 shadow-xs'
              : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Cronómetro Empaque</p>
              <p className="font-mono font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight">
                {formatTime(timerSeconds)}
              </p>
            </div>
            <Clock className={`w-7 h-7 ${isRevisando ? 'text-[#e60000] animate-pulse' : 'text-zinc-400'}`} />
          </div>
        </div>
      </div>

      {/* 2. Barra de Avance y Escáner Láser de Mesa */}
      <div className="px-5 py-3 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-inner">
        {/* Contador de Piezas a Gran Escala */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-black text-2xl sm:text-3xl text-emerald-400 tracking-tight">
              {piezasVerificadas} / {totalPiezasNota}
            </span>
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
              Piezas Empacadas ({porcentajeAvance}%)
            </span>
          </div>

          {/* Barra de Progreso */}
          <div className="w-36 sm:w-56 h-3.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
            <div 
              className={`h-full transition-all duration-300 ${
                allChecked ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${porcentajeAvance}%` }}
            />
          </div>
        </div>

        {/* Input Rápido para Escáner Láser USB / Tipeo Manual de SKU */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Barcode className="w-5 h-5 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              ref={scanInputRef}
              id="laser-scan-input"
              type="text"
              value={manualScanInput}
              onChange={e => setManualScanInput(e.target.value)}
              placeholder="Bipee con pistola o tipee SKU..."
              className="pl-10 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-mono text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 w-64 uppercase tracking-wider"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-xs font-mono font-bold text-zinc-200 transition-colors tap-active"
          >
            Validar
          </button>
        </form>
      </div>

      {/* 3. Feedback Visual Inmediato de Bipeo Láser */}
      {scanFeedback && (
        <div className={`px-5 py-2.5 flex items-center justify-between text-sm font-mono font-bold transition-all animate-in fade-in slide-in-from-top-1 ${
          scanFeedback.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white animate-bounce'
        }`}>
          <div className="flex items-center gap-2">
            {scanFeedback.type === 'success' ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white" />
            )}
            <span>{scanFeedback.message}</span>
          </div>
          <span className="text-xs opacity-80">Feedback Acústico Activo</span>
        </div>
      )}

      {/* 4. Tabla Kiosko de Alta Visibilidad (Ergonomía para 2 Metros de Distancia) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#e60000]" />
            <h3 className="font-heading font-black text-zinc-900 text-lg">
              Lista de Repuestos a Verificar ({items.length} ítems)
            </h3>
          </div>
          <div className="text-xs font-mono text-zinc-500 font-semibold">
            Validación física obligatoria ítem por ítem
          </div>
        </div>

        <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left font-sans">
            <thead className="bg-zinc-50 text-zinc-600 uppercase font-mono text-xs border-b border-zinc-200">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">Estado</th>
                <th className="py-3.5 px-3 w-12 text-center">#</th>
                <th className="py-3.5 px-4 w-44">Código / SKU</th>
                <th className="py-3.5 px-4">Descripción del Repuesto</th>
                <th className="py-3.5 px-4 w-28 text-center">Pasillo</th>
                <th className="py-3.5 px-4 w-36 text-center">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {items.map((it, idx) => {
                const reqCount = Number(it.cantidad_requerida) || 1;
                const count = itemCounts[it.sku] || 0;
                const isComplete = count >= reqCount;
                const isPartial = count > 0 && count < reqCount;
                const isJustScanned = lastScannedSku === it.sku;

                return (
                  <tr
                    key={it.sku || idx}
                    className={`transition-all ${
                      isJustScanned
                        ? 'bg-emerald-100/80 ring-2 ring-emerald-500 ring-inset'
                        : isComplete
                        ? 'bg-emerald-50/50 hover:bg-emerald-50'
                        : isPartial
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    {/* Checkbox / Botón de Acción Rápida */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickToggleItem(it.sku, isComplete ? 0 : reqCount);
                        }}
                        className="flex items-center justify-center mx-auto tap-active"
                        title={isComplete ? "Desmarcar ítem a 0" : `Completar todas las ${reqCount} piezas`}
                      >
                        {isComplete ? (
                          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-xs text-white">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        ) : isPartial ? (
                          <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs font-mono font-black text-xs">
                            {count}/{reqCount}
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl border-2 border-zinc-300 bg-zinc-50 hover:border-zinc-400 transition-colors"></div>
                        )}
                      </button>
                    </td>

                    {/* Número de Fila */}
                    <td className="py-3.5 px-3 text-center text-zinc-400 font-mono font-bold text-sm">
                      {idx + 1}
                    </td>

                    {/* SKU a Gran Escala para Lectura a Distancia */}
                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => handlePieceIncrement(it.sku)}>
                      <div className="font-mono font-black text-xl sm:text-2xl text-zinc-900 tracking-tight">
                        {it.sku}
                      </div>
                      {it.codigo_barra && (
                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          EAN: {it.codigo_barra}
                        </div>
                      )}
                    </td>

                    {/* Descripción del Repuesto */}
                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => handlePieceIncrement(it.sku)}>
                      <div className="font-bold text-zinc-800 text-sm sm:text-base leading-snug">
                        {it.descripcion}
                      </div>
                    </td>

                    {/* Ubicación / Pasillo */}
                    <td className="py-3.5 px-4 text-center cursor-pointer" onClick={() => handlePieceIncrement(it.sku)}>
                      <span className="font-mono font-bold text-xs sm:text-sm bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-xl border border-zinc-200">
                        {it.ubicacion || 'PAS-01'}
                      </span>
                    </td>

                    {/* Cantidad de Piezas con Contador Unitario */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handlePieceIncrement(it.sku)}
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-2xl border-2 transition-all tap-active ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-400 shadow-xs'
                            : isPartial
                            ? 'bg-amber-100 text-amber-950 border-amber-400 shadow-xs'
                            : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:border-zinc-400'
                        }`}
                        title="Tocar para sumar +1 pieza verificada"
                      >
                        <div className="flex items-baseline gap-1 font-mono font-black text-xl sm:text-2xl px-3 py-0.5">
                          <span className={isComplete ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-zinc-800'}>
                            {count}
                          </span>
                          <span className="text-zinc-400 text-sm font-bold">/</span>
                          <span className="text-zinc-700 text-lg sm:text-xl">
                            {reqCount}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
                          {isComplete ? 'COMPLETO' : isPartial ? 'PARCIAL (+1)' : 'TOCAR (+1)'}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Barra de Acciones y Atajos de Teclado */}
      <div className="p-4 sm:p-5 bg-white border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-600">
          <div className="flex items-center gap-1.5">
            <kbd className="px-2.5 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold">
              Espacio
            </kbd>
            <span>{isRevisando ? 'Pausar' : 'Iniciar Empaque'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-2.5 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold">
              Enter
            </kbd>
            <span>{esMostrador ? 'Entrega Mostrador' : 'Finalizar y Despachar'}</span>
          </div>
        </div>

        <div>
          {!isRevisando ? (
            <button
              type="button"
              onClick={() => {
                setIsRunning(true);
                onStartReview(nota.id);
              }}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm sm:text-base rounded-2xl flex items-center gap-2.5 tap-active shadow-md shadow-emerald-600/30 transition-all"
            >
              <Play className="w-5 h-5" />
              <span>INICIAR EMPAQUE (Espacio)</span>
            </button>
          ) : allChecked ? (
            <button
              type="button"
              onClick={() => onFinishReview(nota.id)}
              className="py-3 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm sm:text-base rounded-2xl flex items-center gap-3 tap-active shadow-lg shadow-emerald-600/40 animate-pulse transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {esMostrador ? 'ENTREGAR A CLIENTE (MOSTRADOR)' : 'FINALIZAR Y DESPACHAR (Enter)'}
              </span>
            </button>
          ) : piezasVerificadas === 0 ? (
            <button
              type="button"
              disabled
              className="py-3 px-6 bg-zinc-200 text-zinc-400 border border-zinc-300 font-heading font-bold text-sm sm:text-base rounded-2xl flex items-center gap-2.5 cursor-not-allowed opacity-80"
              title="Escanea los repuestos para comenzar la verificación"
            >
              <PackageCheck className="w-5 h-5" />
              <span>ESCANEAR REPUESTOS (0 / {totalPiezasNota} pzas)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const confirmar = window.confirm(
                  `ATENCIÓN: Aún faltan piezas por verificar (${piezasVerificadas} de ${totalPiezasNota}). ¿Confirmas forzar el despacho con pendientes?`
                );
                if (!confirmar) return;
                onFinishReview(nota.id);
              }}
              className="py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white font-heading font-black text-sm sm:text-base rounded-2xl flex items-center gap-2.5 tap-active shadow-md shadow-amber-500/30 transition-all"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>
                DESPACHAR CON PENDIENTES ({piezasVerificadas}/{totalPiezasNota})
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
