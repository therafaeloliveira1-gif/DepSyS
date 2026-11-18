import React, { useState, useEffect } from 'react';
import { X, Clock, User, Package, CheckCircle, Barcode, AlertTriangle, ArrowRight, Zap, History, PackageX } from 'lucide-react';
import { fetchDetalleNota, fetchOperarios, asignarSeparadorANota, asignarMesaANota, toggleMostrador } from '../services/api';
import { formatDatePY } from '../utils/formatters';

export default function OrderDetailModal({ notaId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operarios, setOperarios] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    cargarDetalle();
  }, [notaId]);

  async function cargarDetalle() {
    setLoading(true);
    try {
      const [resDetalle, resOps] = await Promise.all([
        fetchDetalleNota(notaId),
        fetchOperarios()
      ]);

      if (resDetalle.success) {
        setData(resDetalle);
      }
      if (resOps.success && resOps.operarios) {
        setOperarios(resOps.operarios.filter(o => o.rol === 'SEPARADOR'));
      }
    } catch (err) {
      console.error('Error cargando detalle:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleMostrador() {
    setAssigning(true);
    try {
      await toggleMostrador(notaId);
      await cargarDetalle();
    } catch (err) {
      console.error('Error alternando mostrador:', err);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-zinc-900">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#e60000] font-black text-sm">
              MM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-zinc-900 text-lg">
                  Pedido #{data?.nota?.num_pedido || notaId}
                </h3>
                {data?.nota?.cierre_parcial === 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <PackageX className="w-3 h-3 text-amber-600" />
                    CIERRE PARCIAL ({data?.nota?.total_faltantes || 1} FALTANTES)
                  </span>
                )}
                {data?.nota?.es_mostrador === 1 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-600" />
                    MOSTRADOR (URGENTE)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                    ENVÍO FLETE
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                  {data?.nota?.estado || 'CARGANDO'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {data?.nota?.cliente_nombre} • {data?.nota?.cliente_ciudad || 'Sin ciudad'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMostrador}
              disabled={assigning || !data}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1.5 ${
                data?.nota?.es_mostrador === 1
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:text-zinc-900'
              }`}
              title="Cambiar prioridad entre retiro en local o flete"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>{data?.nota?.es_mostrador === 1 ? 'Retiro Local' : 'Marcar Mostrador'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm font-mono animate-pulse">
            Cargando desglose de repuestos y tiempos...
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-red-600 text-sm font-mono">
            No se pudo cargar la información de la nota.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Panel de Asignación del Supervisor */}
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#e60000]" />
                <span className="font-bold text-zinc-700">Asignar a Separador:</span>
                <select
                  disabled={assigning}
                  value={data.nota.separador_id || ''}
                  onChange={async (e) => {
                    setAssigning(true);
                    const sepId = e.target.value ? Number(e.target.value) : null;
                    await asignarSeparadorANota(data.nota.id, sepId);
                    await cargarDetalle();
                    setAssigning(false);
                  }}
                  className="bg-white border border-zinc-300 text-zinc-900 rounded-lg px-2.5 py-1 text-xs focus:border-[#e60000] focus:outline-none"
                >
                  <option value="">-- Sin Asignar (Libre) --</option>
                  {operarios.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-400 italic">
                  (El reloj de picking arranca de inmediato al asignar)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#e60000]" />
                <span className="font-bold text-zinc-700">Mesa:</span>
                <select
                  disabled={assigning}
                  value={data.nota.mesa_codigo || ''}
                  onChange={async (e) => {
                    const mesaCod = e.target.value;
                    if (mesaCod) {
                      setAssigning(true);
                      await asignarMesaANota(data.nota.id, mesaCod);
                      await cargarDetalle();
                      setAssigning(false);
                    }
                  }}
                  className="bg-white border border-zinc-300 text-zinc-900 rounded-lg px-2.5 py-1 text-xs focus:border-[#e60000] focus:outline-none"
                >
                  <option value="">-- Sin Mesa --</option>
                  <option value="301">Mesa 301</option>
                  <option value="302">Mesa 302</option>
                  <option value="303">Mesa 303</option>
                  <option value="304">Mesa 304</option>
                </select>
              </div>
            </div>

            {/* Tarjeta de Tiempos y Métricas de Ciclo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs font-mono">
              <div>
                <p className="text-zinc-500 font-sans font-semibold">Picking (Neto):</p>
                <p className="font-bold text-zinc-900 text-sm">{data.nota.tiempo_separacion_fmt || '00:00:00'}</p>
                <p className="text-[10px] text-zinc-400 truncate">{data.nota.separador_nombre || '—'}</p>
              </div>

              <div className="sm:border-l border-zinc-200 sm:pl-3">
                <p className="text-zinc-500 font-sans font-semibold">Espera Confirmación:</p>
                <p className="font-bold text-amber-700 text-sm">{data.nota.tiempo_espera_confirmacion_fmt || '00:00:00'}</p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {data.nota.mesa_sugerida_codigo ? `Sugerida: M${data.nota.mesa_sugerida_codigo}` : '—'}
                </p>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-zinc-200 pt-2 sm:pt-0 sm:pl-3">
                <p className="text-zinc-500 font-sans font-semibold">Mesa (Empaque):</p>
                <p className="font-bold text-zinc-900 text-sm">{data.nota.tiempo_mesa_fmt || '00:00:00'}</p>
                <p className="text-[10px] text-zinc-400 truncate">{data.nota.guardador_nombre || '—'}</p>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-zinc-200 pt-2 sm:pt-0 sm:pl-3">
                <p className="text-red-700 font-bold font-sans">Ciclo Total Neto:</p>
                <p className="font-black text-[#e60000] text-sm">{data.nota.tiempo_total_fmt || '00:00:00'}</p>
                <p className="text-[10px] text-zinc-400">Mesa {data.nota.mesa_codigo || '—'}</p>
              </div>
            </div>

            {/* Historial Forense de Transiciones */}
            {data.historial && data.historial.length > 0 && (
              <div className="p-3 bg-zinc-50/70 rounded-2xl border border-zinc-200 text-xs">
                <h4 className="font-heading font-bold text-zinc-700 text-xs mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Línea de Vida y Auditoría de Estados ({data.historial.length})</span>
                </h4>
                <div className="space-y-1.5 font-mono text-[11px] max-h-28 overflow-y-auto">
                  {data.historial.map(h => (
                    <div key={h.id} className="flex items-center justify-between text-zinc-700 py-1 border-b border-zinc-200/60 last:border-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-zinc-400 font-bold">{h.estado_anterior || 'CREADO'}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="text-zinc-900 font-bold">{h.estado_nuevo}</span>
                        {h.operario_nombre && (
                          <span className="text-zinc-500 text-[10px] truncate">({h.operario_nombre})</span>
                        )}
                      </div>
                      <span className="text-zinc-400 text-[10px] shrink-0 ml-2 font-mono">
                        {formatDatePY(h.created_at, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de Repuestos */}
            <div>
              <h4 className="font-heading font-bold text-zinc-900 text-sm mb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#e60000]" />
                <span>Repuestos Solicitados ({data.items?.length || 0})</span>
              </h4>

              <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-zinc-50 text-zinc-500 font-mono text-[10px] uppercase border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-center">Req</th>
                      <th className="py-2.5 px-3 text-center">Bip</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-xs">
                    {data.items?.map(it => (
                      <tr key={it.id} className="hover:bg-zinc-50/80">
                        <td className="py-2 px-3 font-bold text-zinc-900">{it.sku}</td>
                        <td className="py-2 px-3 font-sans text-zinc-800">{it.descripcion}</td>
                        <td className="py-2 px-3 text-center font-bold text-zinc-900">{it.cantidad_requerida}</td>
                        <td className="py-2 px-3 text-center text-emerald-600 font-bold">{it.cantidad_bipada}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full border ${
                            it.es_faltante === 1
                              ? (it.faltante_aprobado === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-300 animate-pulse')
                              : it.cantidad_bipada >= it.cantidad_requerida
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}>
                            {it.es_faltante === 1 ? (it.faltante_aprobado === 1 ? 'Faltante Aprobado' : 'Faltante (Pendiente)') : it.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Log de Bips de Auditoría */}
            {data.bips && data.bips.length > 0 && (
              <div>
                <h4 className="font-heading font-bold text-zinc-900 text-sm mb-2 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-[#e60000]" />
                  <span>Historial de Bipeos Láser ({data.bips.length})</span>
                </h4>
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 max-h-32 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {data.bips.map(b => (
                    <div key={b.id} className="flex items-center justify-between text-zinc-700 py-0.5 border-b border-zinc-200/60 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={b.es_valido ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                          {b.es_valido ? '✓' : '✗'}
                        </span>
                        <span>{b.codigo_leido}</span>
                        {b.mensaje_error && <span className="text-red-600 text-[10px]">({b.mensaje_error})</span>}
                      </div>
                      <span className="text-zinc-400 text-[10px] font-mono">
                        {formatDatePY(b.created_at, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
