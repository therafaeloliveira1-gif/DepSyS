import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, ArrowRight, User, Package, Check } from 'lucide-react';
import { confirmarMesaSupervisor } from '../services/api';

export default function WaitingConfirmationPanel({
  esperas = [],
  mesas = [],
  supervisorActual = null,
  onAccionExitosa
}) {
  const [procesandoId, setProcesandoId] = useState(null);
  const [mesaSeleccionada, setMesaSeleccionada] = useState({});

  if (!esperas || esperas.length === 0) {
    return (
      <div className="p-10 text-center rounded-3xl bg-white border border-zinc-200/90 shadow-sm">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
        <h4 className="text-base font-bold text-zinc-800 font-heading">
          Sin notas en espera de confirmación
        </h4>
        <p className="text-xs text-zinc-500 mt-1">
          Todas las notas entregadas por separadores han sido asignadas a sus respectivas bancadas.
        </p>
      </div>
    );
  }

  async function handleConfirmar(nota) {
    const mesaElegida = mesaSeleccionada[nota.id] || nota.mesa_sugerida_codigo || '301';
    setProcesandoId(nota.id);
    try {
      const supId = supervisorActual ? supervisorActual.id : 5;
      const res = await confirmarMesaSupervisor(nota.id, supId, mesaElegida);
      if (res.success && onAccionExitosa) {
        onAccionExitosa();
      }
    } catch (err) {
      console.error('Error al confirmar mesa:', err);
    } finally {
      setProcesandoId(null);
    }
  }

  const hayDemoraCritica = esperas.some(e => e.alerta_demora || e.segundos_espera >= 180);

  return (
    <div className={`rounded-3xl border p-6 shadow-sm transition-all select-none ${
      hayDemoraCritica
        ? 'bg-amber-50/20 border-amber-300'
        : 'bg-white border-zinc-200/90'
    }`}>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-xl text-zinc-900">
                Notas en Espera de Confirmación de Mesa
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {esperas.length} PENDIENTE{esperas.length > 1 ? 'S' : ''}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              El separador finalizó la recolección física y sugirió mesa. El supervisor debe confirmar la bancada física de destino.
            </p>
          </div>
        </div>

        {hayDemoraCritica && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-mono font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>ALERTA CUELLO DE BOTELLA (&gt; 3 MIN)</span>
          </div>
        )}
      </div>

      {/* Grid de notas pendientes de confirmación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {esperas.map(nota => {
          const mesaActualElegida = mesaSeleccionada[nota.id] || nota.mesa_sugerida_codigo || '301';
          const infoMesa = mesas.find(m => String(m.codigo) === String(mesaActualElegida));
          const colorMesa = infoMesa ? infoMesa.color : 'VERDE';
          const segundos = nota.segundos_espera || 0;
          const mins = Math.floor(segundos / 60);
          const secs = segundos % 60;
          const tiempoEsperaFmt = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          const isCritical = segundos >= 180;

          return (
            <div
              key={nota.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isCritical
                  ? 'bg-amber-50/40 border-amber-300 shadow-sm'
                  : 'bg-zinc-50/70 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      PEDIDO FIREBIRD
                    </span>
                    <span className="text-lg font-heading font-black text-zinc-900">
                      #{nota.num_pedido}
                    </span>
                  </div>

                  {/* Cronómetro en Vivo */}
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border ${
                    isCritical
                      ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                      : 'bg-white text-zinc-700 border-zinc-200'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{tiempoEsperaFmt}</span>
                  </div>
                </div>

                <p className="text-sm font-semibold text-zinc-900 line-clamp-1 mb-3">
                  {nota.cliente_nombre}
                </p>

                {/* Info del separador y piezas */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white border border-zinc-200 text-xs font-mono mb-4">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans font-semibold">SEPARADOR</span>
                    <span className="text-zinc-800 font-bold truncate block">
                      {nota.separador_nombre || 'Asignado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans font-semibold">PIEZAS / ÍTEMS</span>
                    <span className="text-zinc-800 font-bold block">
                      {nota.total_piezas || 0} pzs ({nota.total_items || 0} ítem)
                    </span>
                  </div>
                </div>

                {/* Mesa sugerida y selector */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-zinc-500 font-mono">Mesa sugerida:</span>
                    <span className="font-bold text-amber-700 font-mono">
                      Mesa {nota.mesa_sugerida_codigo || '301'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={mesaActualElegida}
                      onChange={(e) => setMesaSeleccionada(prev => ({ ...prev, [nota.id]: e.target.value }))}
                      className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-[#e60000]"
                    >
                      {mesas.map(m => (
                        <option key={m.codigo} value={m.codigo}>
                          Mesa {m.codigo} ({m.nivel || 'Carga: ' + m.notas_en_cola})
                        </option>
                      ))}
                    </select>

                    <span className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                      colorMesa === 'ROJO'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : colorMesa === 'NARANJA'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {colorMesa}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de Confirmación */}
              <button
                onClick={() => handleConfirmar(nota)}
                disabled={procesandoId === nota.id}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {procesandoId === nota.id ? (
                  <span>CONFIRMANDO...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>CONFIRMAR PARA MESA {mesaActualElegida}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
