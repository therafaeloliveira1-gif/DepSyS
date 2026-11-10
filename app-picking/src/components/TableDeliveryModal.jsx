import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, ArrowRight, Loader2, Sparkles, X, Clock } from 'lucide-react';
import { fetchMesas, finalizarPicking } from '../services/api';
import { playOrderCompleted } from '../services/audioService';

export default function TableDeliveryModal({
  pedido,
  operario,
  onClose,
  onDeliverySuccess
}) {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState(null);

  useEffect(() => {
    cargarMesas();
  }, []);

  async function cargarMesas() {
    setLoading(true);
    const res = await fetchMesas();
    if (res.success && res.mesas) {
      setMesas(res.mesas);
    }
    setLoading(false);
  }

  async function handleConfirmDelivery(mesaCodigo) {
    setSubmitting(true);
    try {
      const res = await finalizarPicking(pedido.id_deposito, operario.id, mesaCodigo);
      if (res.success) {
        setDeliveryResult(res);
        playOrderCompleted();
      } else {
        alert('Error entregando nota: ' + (res.error || 'Desconocido'));
      }
    } catch (err) {
      alert('Error de red al entregar nota: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white border-t sm:border border-zinc-200 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {deliveryResult ? (
          // Vista de Éxito y Resumen de Tiempo Neto
          <div className="text-center py-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-600 mx-auto mb-4 shadow-md shadow-amber-500/20">
              <Clock className="w-8 h-8" />
            </div>

            <span className="text-xs font-mono font-bold text-amber-700 uppercase tracking-wider">
              ¡Picking Finalizado con Éxito!
            </span>
            <h3 className="font-heading font-black text-2xl text-zinc-900 mt-1 mb-2">
              Mesa Sugerida: {selectedMesa}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              La canasta está en la bancada. El supervisor confirmará la asignación definitiva.
            </p>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 my-4 text-left space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-500 font-mono">
                <span>Nota Firebird</span>
                <span className="font-bold text-zinc-900">#{pedido.num_pedido}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-500 font-mono">
                <span>Separador</span>
                <span className="font-bold text-zinc-900">{operario.nombre}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono pt-2 border-t border-zinc-200">
                <span className="text-zinc-700 font-medium">Tiempo Neto Picking</span>
                <span className="font-bold text-[#e60000] text-base">
                  {deliveryResult.tiempoNetoFmt}
                </span>
              </div>
            </div>

            <button
              onClick={onDeliverySuccess}
              className="w-full py-4 bg-[#e60000] hover:bg-[#cc0000] text-white font-heading font-bold text-base rounded-2xl shadow-lg shadow-red-600/30 tap-active"
            >
              Volver a Mis Notas
            </button>
          </div>
        ) : (
          // Selector de Mesa Sugerida
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#e60000]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-zinc-900">
                    ¿En qué Mesa colocas la canasta?
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Sugiere la mesa donde depositaste físicamente los repuestos.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors tap-active"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 py-6">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="h-24 rounded-2xl shimmer"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {mesas.map(m => {
                  const isLibre = m.estado === 'LIBRE';

                  return (
                    <button
                      key={m.codigo}
                      disabled={submitting}
                      onClick={() => {
                        setSelectedMesa(m.codigo);
                        handleConfirmDelivery(m.codigo);
                      }}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between tap-active transition-all ${
                        isLibre
                          ? 'bg-zinc-50 border-zinc-200 hover:border-[#e60000] hover:bg-zinc-100'
                          : 'bg-zinc-50/70 border-zinc-200 opacity-90'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-zinc-500">
                          BANCADA
                        </span>
                        <h4 className="font-heading font-black text-xl text-zinc-900 mt-0.5">
                          Mesa {m.codigo}
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">
                          {m.nombre}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-200 flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isLibre
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}>
                          {m.estado}
                        </span>
                        <ArrowRight className="w-4 h-4 text-zinc-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {submitting && (
              <div className="flex items-center justify-center gap-2 py-3 text-zinc-600 text-sm font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-[#e60000]" />
                <span>Registrando sugerencia de mesa...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
