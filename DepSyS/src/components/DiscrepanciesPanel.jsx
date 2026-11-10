import React, { useState } from 'react';
import { 
  AlertTriangle, 
  PackageX, 
  Search, 
  CheckCircle2, 
  MapPin, 
  RefreshCw, 
  TrendingUp,
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';
import { resolverDiscrepancia } from '../services/api';
import { formatDatePY } from '../utils/formatters';

export default function DiscrepanciesPanel({
  discrepancias = [],
  recurrentes = [],
  supervisorActual,
  onActualizar
}) {
  const [resolviendoId, setResolviendoId] = useState(null);
  const [modalHallado, setModalHallado] = useState(null);
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [comentarioHallado, setComentarioHallado] = useState('');
  const [cargando, setCargando] = useState(false);

  const pendientes = discrepancias.filter(d => d.estado === 'PENDIENTE_REVISION');

  async function handleConfirmarFaltante(disc) {
    if (!window.confirm(`¿Confirmas que el producto SKU ${disc.sku} (${disc.descripcion}) está efectivamente agotado en depósito?\n\nSe aprobará el cierre parcial de la nota #${disc.num_pedido} sin penalizar los tiempos del separador.`)) {
      return;
    }

    setCargando(true);
    setResolviendoId(disc.id);
    try {
      const res = await resolverDiscrepancia(disc.id, {
        supervisorId: supervisorActual?.id || 7,
        accion: 'CONFIRMAR_FALTANTE',
        comentario: 'Verificado físicamente por supervisor. Producto agotado en estante.'
      });

      if (res.success) {
        onActualizar && onActualizar();
      } else {
        alert('Error confirmando faltante: ' + (res.error || 'Error'));
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setCargando(false);
      setResolviendoId(null);
    }
  }

  async function handleConfirmarHallado() {
    if (!modalHallado) return;
    setCargando(true);
    setResolviendoId(modalHallado.id);
    try {
      const res = await resolverDiscrepancia(modalHallado.id, {
        supervisorId: supervisorActual?.id || 7,
        accion: 'HALLADO_EN_DEPOSITO',
        nuevaUbicacion: nuevaUbicacion.trim() || 'Pasillo verificado',
        comentario: comentarioHallado.trim() || `Hallado en depósito (${nuevaUbicacion || 'ubicación corregida'})`
      });

      if (res.success) {
        setModalHallado(null);
        setNuevaUbicacion('');
        setComentarioHallado('');
        onActualizar && onActualizar();
      } else {
        alert('Error: ' + (res.error || 'Error'));
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setCargando(false);
      setResolviendoId(null);
    }
  }

  return (
    <div className="space-y-4 select-none">
      {/* 1. Alerta de Faltantes Recurrentes (Semana) */}
      {recurrentes && recurrentes.length > 0 && (
        <div className="p-5 rounded-3xl bg-red-50 border border-red-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-red-800 font-bold text-sm uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-[#e60000]" />
            <span>Alerta de Inventario: Faltantes Recurrentes (Semana)</span>
            <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-white text-red-700 border border-red-200 font-mono font-bold">
              {recurrentes.length} artículos críticos (≥ 3 faltantes)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {recurrentes.map(r => (
              <div 
                key={r.sku}
                className="p-3.5 rounded-2xl bg-white border border-red-100 shadow-xs flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-800 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                      {r.sku}
                    </span>
                    <span className="text-xs font-mono font-black text-[#e60000] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {r.total_reportes_semana} veces
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-900 mt-1 line-clamp-1">
                    {r.descripcion}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Stock teórico ERP: {Number(r.ultimo_stock_teorico || 0)} unid.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Bandeja de Discrepancias Pendientes de Revisión */}
      <div className="p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-zinc-900 text-lg flex items-center gap-2">
                Discrepancias de Stock y Faltantes Reportados
                {pendientes.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono font-bold text-xs animate-pulse">
                    {pendientes.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500">
                Consulta en vivo Firebird ERP (solo lectura). Supervisor verifica físicamente para confirmar cierre parcial o reubicar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onActualizar && onActualizar()}
            className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200 tap-active transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {pendientes.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-zinc-50/60 border border-zinc-200/80">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-base font-bold text-zinc-800 font-heading">
              Sin discrepancias pendientes
            </h4>
            <p className="text-xs text-zinc-500 mt-1">
              Todos los repuestos reportados han sido verificados y resueltos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendientes.map(d => {
              const stockTeorico = Number(d.stock_teorico_firebird) || 0;
              const tieneStockEnErp = stockTeorico > 0;

              return (
                <div
                  key={d.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    tieneStockEnErp
                      ? 'bg-amber-50/20 border-amber-300 shadow-sm'
                      : 'bg-zinc-50/60 border-zinc-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-white text-zinc-900 border border-zinc-300">
                        {d.sku}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#e60000] bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                        NOTA #{d.num_pedido}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        Cliente: <strong className="text-zinc-800">{d.cliente_nombre || 'Motos Mendes'}</strong>
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDatePY(d.fecha_reporte || d.created_at, true)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 mb-2 leading-snug">
                    {d.descripcion}
                  </h4>

                  {/* Bloque Telemetría ERP Firebird */}
                  <div className={`p-3 rounded-xl mb-3 border text-xs font-mono ${
                    tieneStockEnErp
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-white border-zinc-200 text-zinc-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-amber-600" />
                        Stock ERP Firebird:
                      </span>
                      <span className={`text-sm font-black ${tieneStockEnErp ? 'text-amber-800' : 'text-zinc-700'}`}>
                        {stockTeorico} unidades
                      </span>
                    </div>
                    {tieneStockEnErp && (
                      <div className="mt-1.5 text-[11px] text-amber-800 flex items-center gap-1 font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>¡Alerta! Hay stock en sistema. Requiere verificación física en pasillo.</span>
                      </div>
                    )}
                    <div className="mt-1.5 text-[11px] text-zinc-500 flex items-center justify-between pt-1.5 border-t border-zinc-200/80">
                      <span>Separador: <strong className="text-zinc-800">{d.separador_nombre}</strong></span>
                      <span>Solicitado: <strong className="text-zinc-800">{d.cantidad_requerida} unid.</strong></span>
                    </div>
                  </div>

                  {/* Botones de Resolución para el Supervisor */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={cargando && resolviendoId === d.id}
                      onClick={() => handleConfirmarFaltante(d)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#e60000] hover:bg-[#cc0000] text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm tap-active disabled:opacity-50"
                      title="Aprobar cierre parcial de la nota sin penalizar al separador"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Falta</span>
                    </button>

                    <button
                      type="button"
                      disabled={cargando && resolviendoId === d.id}
                      onClick={() => {
                        setModalHallado(d);
                        setNuevaUbicacion(d.ubicacion_estante || '');
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 tap-active disabled:opacity-50 transition-colors"
                      title="Indicar ubicación física si el producto fue hallado en depósito"
                    >
                      <Search className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Hallado en Depósito</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para indicar nueva ubicación al hallar producto */}
      {modalHallado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h4 className="font-heading font-bold text-zinc-900 text-base mb-1 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600" />
              Producto Hallado en Depósito
            </h4>
            <p className="text-xs text-zinc-500 mb-3">
              Indica la ubicación real encontrada para que el separador complete la nota.
            </p>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 mb-4 text-xs">
              <span className="font-mono font-bold text-zinc-800 px-2 py-0.5 rounded bg-white border border-zinc-300">
                {modalHallado.sku}
              </span>
              <p className="font-semibold text-zinc-800 mt-1">{modalHallado.descripcion}</p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Ubicación Física donde se encontró:
                </label>
                <input
                  type="text"
                  value={nuevaUbicacion}
                  onChange={e => setNuevaUbicacion(e.target.value)}
                  placeholder="Ej: PAS-02 Estante 4B"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#e60000] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nota o Comentario para el separador (opcional):
                </label>
                <input
                  type="text"
                  value={comentarioHallado}
                  onChange={e => setComentarioHallado(e.target.value)}
                  placeholder="Ej: Estaba detrás de la caja mayor"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#e60000] font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setModalHallado(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-xs font-bold tap-active transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cargando}
                onClick={handleConfirmarHallado}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 tap-active disabled:opacity-50"
              >
                {cargando ? 'Guardando...' : 'Reactivar Ítem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
