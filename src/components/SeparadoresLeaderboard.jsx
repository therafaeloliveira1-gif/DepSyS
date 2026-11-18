import React from 'react';
import { Trophy, Zap, Clock, Package, Barcode, User } from 'lucide-react';

export default function SeparadoresLeaderboard({ reporte = [] }) {
  const lista = Array.isArray(reporte) ? reporte : [];

  if (lista.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-400 font-mono bg-white rounded-3xl border border-zinc-200 shadow-sm">
        No hay registros de separación para el período seleccionado.
      </div>
    );
  }

  const topPiezas = [...lista].sort((a, b) => (Number(b.total_piezas) || 0) - (Number(a.total_piezas) || 0))[0];
  const conBips = lista.filter(r => (Number(r.total_bips) || 0) > 0 || (Number(r.segundos_por_bip) || 0) > 0);
  const masVeloz = conBips.length > 0 
    ? [...conBips].sort((a, b) => (Number(a.segundos_por_bip) || 999) - (Number(b.segundos_por_bip) || 999))[0] 
    : null;

  return (
    <div className="space-y-6 select-none">
      {/* Podio de Destacados del Mes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mayor Volumen */}
        {topPiezas && (
          <div className="p-5 bg-gradient-to-r from-red-50 to-white border border-red-200 rounded-3xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e60000] text-white flex items-center justify-center shadow-md shadow-red-600/30">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-red-700 uppercase tracking-widest">
                  MAYOR VOLUMEN DE PIEZAS
                </span>
                <h4 className="font-heading font-black text-xl text-zinc-900 mt-0.5">
                  {topPiezas.operario_nombre || topPiezas.nombre || 'Separador'}
                </h4>
                <p className="text-xs text-zinc-500 font-mono">
                  {Number(topPiezas.total_piezas || 0).toLocaleString('es-PY')} piezas • {topPiezas.total_notas || 0} pedidos
                </p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-2xl font-black text-[#e60000]">{Number(topPiezas.total_piezas || 0).toLocaleString('es-PY')}</span>
              <p className="text-[10px] text-zinc-400">piezas</p>
            </div>
          </div>
        )}

        {/* Mayor Velocidad */}
        {masVeloz && (
          <div className="p-5 bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 rounded-3xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-widest">
                  MÁS RÁPIDO POR BIP
                </span>
                <h4 className="font-heading font-black text-xl text-zinc-900 mt-0.5">
                  {masVeloz.operario_nombre || masVeloz.nombre || 'Separador'}
                </h4>
                <p className="text-xs text-zinc-500 font-mono">
                  Promedio de {masVeloz.segundos_por_bip || 0}s por cada repuesto
                </p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-2xl font-black text-emerald-600">{masVeloz.segundos_por_bip || 0}s</span>
              <p className="text-[10px] text-zinc-400">por bip</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabla Completa de Rendimiento */}
      <div className="bg-white border border-zinc-200/90 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#e60000]" />
            <h3 className="font-heading font-black text-lg text-zinc-900">
              Evaluación Mensual de Separadores (Picking)
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {lista.length} operarios evaluados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-50 text-zinc-500 uppercase font-mono text-[11px] border-b border-zinc-200">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Pos</th>
                <th className="py-3.5 px-4">Separador</th>
                <th className="py-3.5 px-3 text-center">Notas</th>
                <th className="py-3.5 px-3 text-center">Piezas</th>
                <th className="py-3.5 px-3 text-center">Bips Láser</th>
                <th className="py-3.5 px-3 text-center">Tiempo Total</th>
                <th className="py-3.5 px-3 text-center">Promedio / Nota</th>
                <th className="py-3.5 px-4 text-center">Segundos / Bip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {lista.map((op, idx) => {
                const nombre = op.operario_nombre || op.nombre || 'Separador';
                const iniciales = nombre.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('');
                return (
                  <tr key={op.operario_id || idx} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-sans font-medium text-zinc-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 font-heading font-bold text-xs flex items-center justify-center">
                        {iniciales || 'S'}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{nombre}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{op.operario_codigo || `SEP${String(idx+1).padStart(3,'0')}`}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-zinc-700">
                      {op.total_notas || 0}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-zinc-900 text-sm">
                      {Number(op.total_piezas || 0).toLocaleString('es-PY')}
                    </td>
                    <td className="py-3.5 px-3 text-center text-zinc-500">
                      {op.total_bips || 0}
                    </td>
                    <td className="py-3.5 px-3 text-center text-zinc-600">
                      {op.tiempo_total_fmt || '00:00:00'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-zinc-600">
                      {op.tiempo_promedio_nota_fmt || '00:00:00'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-xl font-bold ${
                        Number(op.segundos_por_bip) > 0 && Number(op.segundos_por_bip) <= 20
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : Number(op.segundos_por_bip) > 20
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {Number(op.segundos_por_bip) > 0 ? `${op.segundos_por_bip}s` : '—'}
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
