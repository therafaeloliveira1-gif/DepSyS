import React from 'react';
import { PackageCheck, Clock, User, ShieldCheck } from 'lucide-react';

export default function GuardadoresLeaderboard({ reporte = [] }) {
  const lista = Array.isArray(reporte) ? reporte : [];

  if (lista.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-400 font-mono bg-white rounded-3xl border border-zinc-200 shadow-sm">
        No hay registros de revisión en mesa para el período seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      <div className="bg-white border border-zinc-200/90 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#e60000]" />
            <h3 className="font-heading font-black text-lg text-zinc-900">
              Evaluación Mensual de Guardadores (Mesas de Control & Empaque)
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {lista.length} guardadores evaluados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-50 text-zinc-500 uppercase font-mono text-[11px] border-b border-zinc-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Pos</th>
                <th className="py-3.5 px-4">Guardador / Mesa</th>
                <th className="py-3.5 px-3 text-center">Notas Revisadas</th>
                <th className="py-3.5 px-3 text-center">Piezas Embaladas</th>
                <th className="py-3.5 px-3 text-center">Tiempo Total Mesa</th>
                <th className="py-3.5 px-3 text-center">Promedio / Nota</th>
                <th className="py-3.5 px-4 text-center">Tiempo Total Ciclo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {lista.map((op, idx) => {
                const nombre = op.operario_nombre || op.guardador_nombre || op.nombre || 'Guardador';
                const iniciales = nombre.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('');
                return (
                  <tr key={op.operario_id || idx} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-sans font-medium text-zinc-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 font-heading font-bold text-xs flex items-center justify-center">
                        {iniciales || 'G'}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{nombre}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{op.operario_codigo || `GRD${String(idx+1).padStart(3,'0')}`}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-zinc-900 text-sm">
                      {op.total_notas || op.total_pedidos_revisados || 0}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-zinc-700">
                      {Number(op.total_piezas || 0).toLocaleString('es-PY')}
                    </td>
                    <td className="py-3.5 px-3 text-center text-zinc-600">
                      {op.tiempo_total_mesa_fmt || '00:00:00'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-zinc-600">
                      {op.tiempo_promedio_mesa_fmt || '00:00:00'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-[#e60000]">
                        {op.tiempo_total_ciclo_fmt || op.tiempo_total_mesa_fmt || '00:00:00'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
