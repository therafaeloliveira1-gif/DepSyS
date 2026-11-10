import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Eye, Package, User } from 'lucide-react';

export default function DelayRadarTable({
  notas,
  filter,
  onInspectNota
}) {
  const filtered = notas.filter(n => {
    if (filter === 'ALL') return true;
    return n.estado === filter;
  });

  function getStatusDelay(nota) {
    if (nota.estado === 'FINALIZADO') {
      return {
        level: 'COMPLETADO',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Finalizado',
        isCritical: false
      };
    }

    let startTime = nota.inicio_separacion ? new Date(nota.inicio_separacion) : new Date(nota.fecha_ingreso);
    let now = new Date();
    let diffMinutes = Math.floor((now - startTime) / (1000 * 60));

    if (diffMinutes > 35) {
      return {
        level: 'CRITICO',
        badge: 'bg-red-50 text-red-700 border-red-300 animate-beacon',
        label: `Demora > 35m (${diffMinutes}m)`,
        isCritical: true,
        minutes: diffMinutes
      };
    } else if (diffMinutes >= 20) {
      return {
        level: 'ATENCION',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        label: `Atención (${diffMinutes}m)`,
        isCritical: false,
        minutes: diffMinutes
      };
    } else {
      return {
        level: 'OPTIMO',
        badge: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        label: `Normal (${diffMinutes}m)`,
        isCritical: false,
        minutes: diffMinutes
      };
    }
  }

  return (
    <div className="bg-white border border-zinc-200/90 rounded-3xl overflow-hidden shadow-sm select-none">
      <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#e60000]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-lg text-zinc-900">
              Semáforo de Tiempos & Demoras de Depósito
            </h3>
            <p className="text-xs text-zinc-500">
              Monitoreo continuo: notas con más de 35 minutos se marcan con baliza roja de advertencia.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 font-semibold">
          Mostrando {filtered.length} pedidos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-zinc-50 text-zinc-500 uppercase font-mono text-[11px] border-b border-zinc-200">
            <tr>
              <th className="py-3.5 px-4 w-36">Semáforo</th>
              <th className="py-3.5 px-3 w-28">Nota</th>
              <th className="py-3.5 px-3">Cliente / Destino</th>
              <th className="py-3.5 px-3 w-28 text-center">Estado</th>
              <th className="py-3.5 px-3 w-32">Operario</th>
              <th className="py-3.5 px-3 w-24 text-center">Mesa</th>
              <th className="py-3.5 px-3 w-28 text-center">Tiempo Neto</th>
              <th className="py-3.5 px-3 w-28 text-center">Repuestos</th>
              <th className="py-3.5 px-4 w-20 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-400 font-mono">
                  No hay pedidos en este estado en este momento.
                </td>
              </tr>
            ) : (
              filtered.map(nota => {
                const delay = getStatusDelay(nota);

                return (
                  <tr
                    key={nota.id}
                    className={`hover:bg-zinc-50/80 transition-colors ${
                      delay.isCritical ? 'bg-red-50/30' : ''
                    }`}
                  >
                    {/* Alerta Semáforo */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${delay.badge}`}>
                        {delay.isCritical && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>}
                        <span>{delay.label}</span>
                      </span>
                    </td>

                    {/* Nota */}
                    <td className="py-3.5 px-3 font-mono font-bold text-[#e60000]">
                      #{nota.num_pedido}
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-zinc-900 line-clamp-1">
                        {nota.cliente_nombre}
                      </p>
                      {nota.cliente_ciudad && (
                        <p className="text-[10px] text-zinc-400 font-mono">{nota.cliente_ciudad}</p>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                        nota.estado === 'FINALIZADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : nota.estado === 'SEPARANDO'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : nota.estado === 'EN_MESA'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}>
                        {nota.estado}
                      </span>
                    </td>

                    {/* Operario Responsable */}
                    <td className="py-3.5 px-3 text-zinc-700 truncate max-w-[130px] font-medium">
                      {nota.guardador_nombre || nota.separador_nombre || '—'}
                    </td>

                    {/* Mesa */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-zinc-800">
                      {nota.mesa_codigo ? `Mesa ${nota.mesa_codigo}` : '—'}
                    </td>

                    {/* Tiempo Neto */}
                    <td className="py-3.5 px-3 text-center font-mono text-zinc-600 font-semibold">
                      {nota.tiempo_total_fmt || nota.tiempo_separacion_fmt || '00:00:00'}
                    </td>

                    {/* Repuestos / Piezas */}
                    <td className="py-3.5 px-3 text-center font-mono text-zinc-500">
                      <span>{nota.total_items} it</span>
                      <span className="mx-1">•</span>
                      <span className="font-bold text-zinc-800">{nota.total_piezas} pz</span>
                    </td>

                    {/* Acción */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onInspectNota(nota.id)}
                        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 tap-active transition-colors"
                        title="Ver detalle del pedido"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
