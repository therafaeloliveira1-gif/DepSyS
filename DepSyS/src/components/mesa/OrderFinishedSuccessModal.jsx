import React, { useState, useEffect } from 'react';
import { PackageCheck, ArrowRight, Printer, Check } from 'lucide-react';
import { imprimirRotuloBulto } from '../../utils/thermalPrinter';

export default function OrderFinishedSuccessModal({
  nota,
  metrics,
  onNextOrder
}) {
  const [autoPrint, setAutoPrint] = useState(() => {
    try {
      return localStorage.getItem('depsys_thermal_autoprint') !== 'false';
    } catch {
      return true;
    }
  });

  const [imprimiendo, setImprimiendo] = useState(false);
  const [impreso, setImpreso] = useState(false);

  // Auto-impresión inmediata al abrir el modal si está activada
  useEffect(() => {
    if (autoPrint && nota) {
      handleImprimir();
    }
  }, [nota?.id]);

  // Atajo de teclado 'P' para reimprimir
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleImprimir();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nota, metrics]);

  function handleImprimir() {
    setImprimiendo(true);
    imprimirRotuloBulto(nota, metrics);
    setTimeout(() => {
      setImprimiendo(false);
      setImpreso(true);
    }, 400);
  }

  function toggleAutoPrint() {
    setAutoPrint(prev => {
      const next = !prev;
      try {
        localStorage.setItem('depsys_thermal_autoprint', String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200 select-none">
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-md shadow-emerald-500/20 animate-bounce">
          <PackageCheck className="w-10 h-10" />
        </div>

        <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">
          ¡Proceso Completado y Empacado!
        </span>
        <h2 className="font-heading font-black text-3xl text-zinc-900 mt-1 mb-2">
          Pedido #{nota?.num_pedido} Listo
        </h2>
        <p className="text-xs text-zinc-500 font-mono mb-5">
          {nota?.cliente_nombre} • {nota?.cliente_ciudad || 'SGLOJA'}
        </p>

        {/* Tarjeta de Tiempos Netos Consolidados */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-left mb-5">
          <div className="p-2">
            <span className="text-[10px] text-zinc-500 font-mono uppercase">1. Picking</span>
            <h4 className="font-mono font-bold text-base text-zinc-900 mt-0.5">
              {nota?.tiempo_separacion_fmt || '00:00:00'}
            </h4>
            <p className="text-[10px] text-zinc-500 truncate">
              {nota?.separador_nombre || 'Separador'}
            </p>
          </div>

          <div className="p-2 border-x border-zinc-200">
            <span className="text-[10px] text-zinc-500 font-mono uppercase">2. Mesa</span>
            <h4 className="font-mono font-bold text-base text-zinc-900 mt-0.5">
              {metrics?.tiempoNetoMesaFmt || '00:00:00'}
            </h4>
            <p className="text-[10px] text-zinc-500">
              Control & Empaque
            </p>
          </div>

          <div className="p-2 bg-red-50 rounded-xl border border-red-200">
            <span className="text-[10px] text-red-700 font-mono uppercase font-bold">Ciclo Total</span>
            <h4 className="font-mono font-black text-lg text-[#e60000] mt-0.5">
              {metrics?.tiempoTotalCicloFmt || '00:00:00'}
            </h4>
            <p className="text-[10px] text-zinc-600 font-mono">
              Neto efectivo
            </p>
          </div>
        </div>

        {/* Controles de Impresión Térmica */}
        <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 mb-5 flex items-center justify-between gap-3 text-left">
          <button
            type="button"
            onClick={handleImprimir}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all tap-active ${
              impreso 
                ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{imprimiendo ? 'Imprimiendo...' : impreso ? 'Reimprimir Rótulo (P)' : 'Imprimir Rótulo (P)'}</span>
          </button>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-600 select-none">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={toggleAutoPrint}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300"
            />
            <span>Auto-imprimir</span>
          </label>
        </div>

        {/* Botón Principal para Continuar */}
        <button
          type="button"
          onClick={onNextOrder}
          autoFocus
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-heading font-black text-base rounded-2xl flex items-center justify-center gap-2 tap-active shadow-lg shadow-emerald-600/30 transition-all"
        >
          <span>TOMAR SIGUIENTE NOTA (Enter)</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
