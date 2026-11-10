import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  PackageX, 
  Layers, 
  ArrowRight, 
  ShieldAlert, 
  Check, 
  Eye, 
  User, 
  MapPin, 
  RefreshCw,
  Search,
  Zap,
  Filter,
  Sparkles,
  TrendingUp,
  Building2
} from 'lucide-react';
import { confirmarMesaSupervisor, resolverDiscrepancia } from '../services/api';
import { formatDatePY } from '../utils/formatters';

export default function BandejaExcepcionesPanel({
  esperas = [],
  discrepancias = [],
  recurrentes = [],
  notas = [],
  mesas = [],
  supervisorActual,
  onActualizar,
  onInspectNota
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ESPERAS' | 'FALTANTES' | 'DEMORAS'
  const [procesandoId, setProcesandoId] = useState(null);
  const [mesaSeleccionada, setMesaSeleccionada] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [modalHallado, setModalHallado] = useState(null);
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [comentarioHallado, setComentarioHallado] = useState('');

  const q = busqueda.toLowerCase().trim();

  // 0. Esperas de mesa filtradas por búsqueda
  const esperasFiltradas = (esperas || []).filter(n => {
    if (!q) return true;
    return (
      String(n.num_pedido || '').toLowerCase().includes(q) ||
      String(n.cliente_nombre || '').toLowerCase().includes(q) ||
      String(n.separador_nombre || '').toLowerCase().includes(q)
    );
  });

  // 1. Filtrar demoras (>= 35 min, unificado con App.jsx)
  const demorasCriticas = (notas || [])
    .filter(n => n.estado !== 'FINALIZADO')
    .map(nota => {
      const minBackend = Number(nota.minutos_en_deposito);
      let diffMinutes = (!Number.isNaN(minBackend) && minBackend > 0)
        ? minBackend
        : Math.floor((Date.now() - (nota.inicio_separacion ? new Date(nota.inicio_separacion) : new Date(nota.fecha_ingreso)).getTime()) / 60000);
      return { ...nota, minutos_transcurridos: diffMinutes };
    })
    .filter(n => n.minutos_transcurridos >= 35)
    .filter(n => {
      if (!q) return true;
      return (
        String(n.num_pedido || '').toLowerCase().includes(q) ||
        String(n.cliente_nombre || '').toLowerCase().includes(q) ||
        String(n.separador_nombre || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.minutos_transcurridos - a.minutos_transcurridos);

  // 2. Discrepancias pendientes filtradas por búsqueda
  const discrepanciasPendientes = (discrepancias || [])
    .filter(d => d.estado === 'PENDIENTE_REVISION')
    .filter(d => {
      if (!q) return true;
      return (
        String(d.num_pedido || '').toLowerCase().includes(q) ||
        String(d.sku || '').toLowerCase().includes(q) ||
        String(d.descripcion || '').toLowerCase().includes(q) ||
        String(d.separador_nombre || '').toLowerCase().includes(q)
      );
    });

  const totalExcepciones = esperasFiltradas.length + discrepanciasPendientes.length + demorasCriticas.length;

  // Acciones: Confirmar Mesa
  async function handleConfirmarMesa(nota) {
    const mesaElegida = mesaSeleccionada[nota.id] || nota.mesa_sugerida_codigo || '301';
    setProcesandoId(nota.id);
    try {
      const supId = supervisorActual ? supervisorActual.id : 5;
      const res = await confirmarMesaSupervisor(nota.id, supId, mesaElegida);
      if (res.success && onActualizar) {
        onActualizar();
      }
    } catch (err) {
      console.error('Error al confirmar mesa:', err);
    } finally {
      setProcesandoId(null);
    }
  }

  // Acciones: Resolver Faltante ERP
  async function handleConfirmarFaltante(disc) {
    if (!window.confirm(`¿Confirmas que el producto SKU ${disc.sku} (${disc.descripcion}) está agotado físicamente en depósito? Se cerrará la línea sin penalizar al separador.`)) {
      return;
    }
    setProcesandoId(disc.id);
    try {
      const res = await resolverDiscrepancia(disc.id, {
        supervisorId: supervisorActual?.id || 7,
        accion: 'CONFIRMAR_FALTANTE',
        comentario: 'Verificado físicamente por supervisor. Producto agotado en estante.'
      });
      if (res.success && onActualizar) {
        onActualizar();
      }
    } catch (err) {
      alert('Error al resolver discrepancia');
    } finally {
      setProcesandoId(null);
    }
  }

  // Acciones: Producto Hallado en Depósito
  async function handleConfirmarHallado() {
    if (!modalHallado) return;
    setProcesandoId(modalHallado.id);
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
        if (onActualizar) onActualizar();
      } else {
        alert('Error: ' + (res.error || 'Desconocido'));
      }
    } catch (err) {
      alert('Error al reactivar ítem');
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      
      {/* 1. Encabezado de la Bandeja Unificada */}
      <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
            totalExcepciones > 0 
              ? 'bg-red-50 border border-red-200 text-[#e60000] animate-pulse' 
              : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading font-black text-2xl text-zinc-900 tracking-tight">
                Bandeja Unificada de Excepciones
              </h2>
              {totalExcepciones > 0 ? (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-red-600 text-white shadow-xs">
                  {totalExcepciones} BLOQUEO{totalExcepciones > 1 ? 'S' : ''}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  FLUJO ÓPTIMO (0)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Centro de mando para desbloquear bancadas en espera, autorizar faltantes de stock y mitigar demoras en pasillos.
            </p>
          </div>
        </div>

        {/* Botón Refrescar */}
        <button
          onClick={onActualizar}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-heading font-bold text-zinc-700 transition-colors tap-active"
        >
          <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
          <span>Actualizar Excepciones</span>
        </button>
      </div>

      {/* 2. Barra de Filtros / Tabs Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
            }`}
          >
            <span>Todas</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'ALL' ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-700'
            }`}>
              {totalExcepciones}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ESPERAS')}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ESPERAS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Esperas de Mesa</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'ESPERAS' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {esperasFiltradas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('FALTANTES')}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
              activeTab === 'FALTANTES'
                ? 'bg-[#e60000] text-white shadow-xs'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
            }`}
          >
            <PackageX className="w-3.5 h-3.5" />
            <span>Faltantes ERP ("No Hay")</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'FALTANTES' ? 'bg-red-800 text-white' : 'bg-red-100 text-red-800'
            }`}>
              {discrepanciasPendientes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('DEMORAS')}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
              activeTab === 'DEMORAS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Demoras &gt; 35m</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'DEMORAS' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {demorasCriticas.length}
            </span>
          </button>
        </div>

        {/* Buscador de pedidos o repuestos */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por pedido, SKU o cliente..."
            className="pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-sans text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-red-500 w-64"
          />
        </div>
      </div>

      {/* 3. Contenedor de Excepciones o Estado Vacío */}
      {totalExcepciones === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-zinc-200/90 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-black text-xl text-zinc-900">
            ¡Depósito Fluyendo al 100%!
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 font-medium">
            No existen notas trabadas en mesa, no hay discrepancias de stock pendientes y todos los pedidos están dentro de la ventana estándar de tiempo.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SECCIÓN A: ESPERAS DE MESA */}
          {(activeTab === 'ALL' || activeTab === 'ESPERAS') && esperasFiltradas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="font-heading font-black text-zinc-900 text-base">
                  Mesas Esperando Confirmación de Bancada ({esperasFiltradas.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {esperasFiltradas.map(nota => {
                  const mesaActualElegida = mesaSeleccionada[nota.id] || nota.mesa_sugerida_codigo || '301';
                  const isProcessing = procesandoId === nota.id;

                  return (
                    <div
                      key={nota.id}
                      className="p-5 rounded-2xl border border-amber-300 bg-amber-50/30 flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-mono font-black text-[#e60000]">
                            NOTA #{nota.num_pedido}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            ⏱️ Espera: {nota.tiempo_espera_fmt || 'En curso'}
                          </span>
                        </div>

                        <h4 className="font-heading font-bold text-zinc-900 text-base leading-snug">
                          {nota.cliente_nombre}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1 font-mono">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Separó: {nota.separador_nombre || 'Separador'}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-amber-200/80 space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-600 font-bold">Mesa Destino:</span>
                          <select
                            value={mesaActualElegida}
                            onChange={e => setMesaSeleccionada({ ...mesaSeleccionada, [nota.id]: e.target.value })}
                            className="px-2.5 py-1 bg-white border border-zinc-300 rounded-lg text-xs font-bold text-zinc-800"
                          >
                            {mesas.map(m => (
                              <option key={m.codigo} value={m.codigo}>
                                Mesa {m.codigo} ({m.guardador_nombre || 'Disponible'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleConfirmarMesa(nota)}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl flex items-center justify-center gap-2 tap-active shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isProcessing ? 'Autorizando...' : `Autorizar en Mesa ${mesaActualElegida}`}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN B: FALTANTES DE STOCK / DISCREPANCIAS */}
          {(activeTab === 'ALL' || activeTab === 'FALTANTES') && discrepanciasPendientes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PackageX className="w-4 h-4 text-[#e60000]" />
                <h3 className="font-heading font-black text-zinc-900 text-base">
                  Faltantes Reportados en Pasillos ({discrepanciasPendientes.length})
                </h3>
              </div>

              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-zinc-50 text-zinc-600 uppercase font-mono text-[11px] border-b border-zinc-200">
                    <tr>
                      <th className="py-3 px-4 w-28">Nota</th>
                      <th className="py-3 px-4 w-36">SKU</th>
                      <th className="py-3 px-4">Descripción del Repuesto</th>
                      <th className="py-3 px-4 w-28 text-center">Pasillo</th>
                      <th className="py-3 px-4 w-28 text-center">Stock ERP</th>
                      <th className="py-3 px-4 w-28 text-center">Cant. Faltante</th>
                      <th className="py-3 px-4 w-36 text-center">Separador</th>
                      <th className="py-3 px-4 w-64 text-right">Acción Supervisor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {discrepanciasPendientes.map(disc => {
                      const isProcessing = procesandoId === disc.id;
                      const stockErp = Number(disc.stock_teorico_firebird || 0);

                      return (
                        <tr key={disc.id} className="hover:bg-red-50/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#e60000]">
                            #{disc.num_pedido}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-zinc-900 text-sm">
                            {disc.sku}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-zinc-800">
                            {disc.descripcion}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-600">
                            {disc.ubicacion || disc.ubicacion_estante || 'PAS-01'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border ${
                              stockErp > 0
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                            }`}>
                              {stockErp} unid.
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-black text-sm text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                              {disc.cantidad_discrepancia || disc.cantidad_requerida || 1} pzas
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-zinc-600">
                            {disc.separador_nombre || 'Separador'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => {
                                  setModalHallado(disc);
                                  setNuevaUbicacion(disc.ubicacion_estante || disc.ubicacion || '');
                                }}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-heading font-bold text-xs rounded-xl tap-active"
                                title="El producto sí se encontró en el depósito"
                              >
                                Hallado
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleConfirmarFaltante(disc)}
                                className="px-3 py-1.5 bg-[#e60000] hover:bg-[#cc0000] disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl tap-active shadow-xs"
                              >
                                {isProcessing ? '...' : 'Confirmar Falta'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alerta de Faltantes Recurrentes de la Semana */}
              {recurrentes && recurrentes.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200">
                  <div className="flex items-center gap-2 mb-2.5 text-red-900 font-bold text-xs uppercase font-mono">
                    <TrendingUp className="w-4 h-4 text-[#e60000]" />
                    <span>Artículos con Faltante Recurrente esta Semana ({recurrentes.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {recurrentes.map(r => (
                      <div key={r.sku} className="p-2.5 rounded-xl bg-white border border-red-100 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-zinc-900">{r.sku}</span>
                          <p className="text-zinc-600 truncate text-[11px]">{r.descripcion}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-red-50 text-[#e60000] font-mono font-black text-[10px] border border-red-200 shrink-0">
                          {r.total_reportes_semana}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN C: RADAR DE DEMORAS CRÍTICAS */}
          {(activeTab === 'ALL' || activeTab === 'DEMORAS') && demorasCriticas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h3 className="font-heading font-black text-zinc-900 text-base">
                  Pedidos con Demora Crítica (&gt; 35 minutos) ({demorasCriticas.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demorasCriticas.map(nota => (
                  <div
                    key={nota.id}
                    className="p-5 rounded-2xl border border-red-300 bg-red-50/20 flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-mono font-black text-[#e60000]">
                          NOTA #{nota.num_pedido}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-600 text-white animate-pulse">
                          ⚠️ {nota.minutos_transcurridos} MINUTOS
                        </span>
                      </div>

                      <h4 className="font-heading font-bold text-zinc-900 text-base leading-snug">
                        {nota.cliente_nombre}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 font-mono">
                        Estado: <strong className="text-zinc-800">{nota.estado}</strong> • {nota.total_items} items ({nota.total_piezas} pzas)
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-red-200 flex items-center justify-between">
                      <span className="text-xs text-zinc-500 font-mono">
                        {nota.separador_nombre ? `Recolector: ${nota.separador_nombre}` : 'Sin recolector'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onInspectNota && onInspectNota(nota.id)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-heading font-bold text-xs rounded-xl flex items-center gap-1.5 tap-active"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspeccionar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal para indicar ubicación física cuando el producto fue hallado */}
      {modalHallado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h4 className="font-heading font-bold text-zinc-900 text-base mb-1 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600" />
              Producto Hallado en Depósito
            </h4>
            <p className="text-xs text-zinc-500 mb-3">
              Indica la ubicación real encontrada para que el separador recolecte el repuesto.
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
                  Comentario para el separador (opcional):
                </label>
                <input
                  type="text"
                  value={comentarioHallado}
                  onChange={e => setComentarioHallado(e.target.value)}
                  placeholder="Ej: Estaba en la caja superior"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#e60000] font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setModalHallado(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-xs font-bold tap-active transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoId === modalHallado.id}
                onClick={handleConfirmarHallado}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm tap-active disabled:opacity-50"
              >
                {procesandoId === modalHallado.id ? 'Guardando...' : 'Reactivar Ítem'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
