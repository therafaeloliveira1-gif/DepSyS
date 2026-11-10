import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  Users, 
  Layers, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Zap, 
  ChevronRight, 
  Flame,
  Activity,
  SlidersHorizontal,
  CheckCheck
} from 'lucide-react';
import { 
  fetchPedidosConfirmados, 
  asignarSeparadorANota, 
  asignarMesaANota, 
  fetchEstadoGeneralSupervisor,
  fetchMesas
} from '../services/api';
import { formatDatePY } from '../utils/formatters';

function formatSegundos(seg) {
  if (!seg || seg <= 0) return '0s';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export default function PickingAssignmentPanel({ 
  supervisorActual, 
  onAsignacionExitosa 
}) {
  const [pedidos, setPedidos] = useState([]);
  const [separadores, setSeparadores] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros y Búsqueda de Pedidos
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('ALL'); // ALL, MOSTRADOR, NORMAL
  const [criterioOrden, setCriterioOrden] = useState('PRIORIDAD'); // PRIORIDAD, ANTIGUO, MONTO

  // Filtro del plantel de separadores
  const [filtroPlantel, setFiltroPlantel] = useState('ALL'); // ALL | LIBRES | OCUPADOS

  // Selección activa para Asignar
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedSeparadorId, setSelectedSeparadorId] = useState(null);
  const [asignando, setAsignando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    cargarDatos(true);
    const interval = setInterval(() => {
      cargarDatos(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  async function cargarDatos(showLoading = false) {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const [resPedidos, resGen, resMesas] = await Promise.all([
        fetchPedidosConfirmados(),
        fetchEstadoGeneralSupervisor(),
        fetchMesas()
      ]);

      if (resPedidos.success && Array.isArray(resPedidos.pedidos)) {
        setPedidos(resPedidos.pedidos);
        if (selectedPedido) {
          const sigueExistiendo = resPedidos.pedidos.find(p => p.id === selectedPedido.id);
          if (!sigueExistiendo) {
            setSelectedPedido(null);
          } else {
            setSelectedPedido(sigueExistiendo);
          }
        }
      }

      if (resGen && resGen.success) {
        if (Array.isArray(resGen.separadores)) {
          setSeparadores(resGen.separadores);
        }
        if (Array.isArray(resGen.mesas) && resGen.mesas.length > 0) {
          setMesas(resGen.mesas);
        } else if (resMesas && resMesas.success && Array.isArray(resMesas.mesas)) {
          setMesas(resMesas.mesas);
        }
      } else if (resMesas && resMesas.success && Array.isArray(resMesas.mesas)) {
        setMesas(resMesas.mesas);
      }
    } catch (err) {
      console.error('Error cargando datos de asignación de picking:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Filtrado y Ordenamiento de Pedidos Confirmados
  const pedidosFiltrados = useMemo(() => {
    let list = pedidos.filter(p => {
      const q = busqueda.toLowerCase().trim();
      const matchBusqueda = !q || 
        String(p.num_pedido || '').toLowerCase().includes(q) ||
        String(p.cliente_nombre || '').toLowerCase().includes(q) ||
        String(p.cliente_ciudad || '').toLowerCase().includes(q);

      if (!matchBusqueda) return false;
      if (filtroTipo === 'MOSTRADOR') return Boolean(p.es_mostrador);
      if (filtroTipo === 'NORMAL') return !p.es_mostrador;
      return true;
    });

    if (criterioOrden === 'PRIORIDAD') {
      list.sort((a, b) => (b.es_mostrador ? 1 : 0) - (a.es_mostrador ? 1 : 0));
    } else if (criterioOrden === 'MONTO') {
      list.sort((a, b) => Number(b.valor_total || 0) - Number(a.valor_total || 0));
    } else if (criterioOrden === 'ANTIGUO') {
      list.sort((a, b) => new Date(a.fecha_aprobacion_credito || a.fecha_creacion || 0) - new Date(b.fecha_aprobacion_credito || b.fecha_creacion || 0));
    }

    return list;
  }, [pedidos, busqueda, filtroTipo, criterioOrden]);

  // Contadores
  const libresCount = separadores.filter(s => s.libre).length;
  const ocupadosCount = separadores.filter(s => !s.libre).length;
  const totalSeparadores = separadores.length || 1;
  const tasaOcupacion = Math.round((ocupadosCount / totalSeparadores) * 100);

  const mesasLibresCount = mesas.filter(m => !m.ocupada && (!m.notas_en_cola || Number(m.notas_en_cola) === 0)).length;
  const totalMesas = mesas.length || 18;

  // Ejecución de Asignación
  async function ejecutarAsignacion() {
    if (!selectedPedido || !selectedSeparadorId) {
      setErrorMsg('Debes seleccionar un pedido y un separador disponible.');
      return;
    }

    setAsignando(true);
    setErrorMsg(null);
    setMensajeExito(null);

    try {
      const res = await asignarSeparadorANota(selectedPedido.id, selectedSeparadorId);

      if (res.success) {
        const sepObj = separadores.find(s => s.id === selectedSeparadorId);
        setMensajeExito(`¡Pedido #${selectedPedido.num_pedido} asignado exitosamente a ${sepObj ? sepObj.nombre : 'separador'}!`);
        setSelectedPedido(null);
        setSelectedSeparadorId(null);
        await cargarDatos(false);
        if (onAsignacionExitosa) onAsignacionExitosa();

        setTimeout(() => {
          setMensajeExito(null);
        }, 5000);
      } else {
        setErrorMsg(res.error || 'No se pudo asignar el separador.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error en la conexión al asignar.');
    } finally {
      setAsignando(false);
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. KPIs Directos (Sin Header duplicado ni botones de actualizar repetidos) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* KPI 1: Por Asignar */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase font-mono tracking-wider">
              Por Asignar
            </span>
            {pedidos.filter(p => p.es_mostrador).length > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {pedidos.filter(p => p.es_mostrador).length} mostrador
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-heading font-black text-zinc-900">
              {pedidos.length}
            </span>
            <span className="text-xs text-zinc-500 font-semibold font-mono">pedidos en cola</span>
          </div>
        </div>

        {/* KPI 2: Separadores Libres */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase font-mono tracking-wider">
              Separadores Libres
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Disponibles
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-heading font-black text-emerald-600">
              {libresCount}
            </span>
            <span className="text-xs text-zinc-500 font-semibold font-mono">de {totalSeparadores} operarios</span>
          </div>
        </div>

        {/* KPI 3: En Picking Activo */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase font-mono tracking-wider">
              En Picking Activo
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {tasaOcupacion}% ocupación
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-heading font-black text-blue-600">
              {ocupadosCount}
            </span>
            <span className="text-xs text-zinc-500 font-semibold font-mono">en pasillos</span>
          </div>
        </div>
      </div>

      {/* Alertas de Éxito / Error */}
      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs sm:text-sm font-bold">{mensajeExito}</p>
          </div>
          <button 
            onClick={() => setMensajeExito(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-xs sm:text-sm font-bold">{errorMsg}</p>
          </div>
          <button 
            onClick={() => setErrorMsg(null)}
            className="text-xs text-red-700 hover:text-red-900 font-bold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 2. Grid Principal: Bandeja de Pedidos (Izquierda) + Monitor o Asignador (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* BANDEJA IZQUIERDA: Pedidos Confirmados Esperando Separador */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
              <h3 className="font-heading font-black text-base text-zinc-900 flex items-center gap-2">
                <span>Pedidos Confirmados</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {pedidosFiltrados.length}
                </span>
              </h3>

              {/* Selector de Orden */}
              <button
                type="button"
                onClick={() => setCriterioOrden(criterioOrden === 'PRIORIDAD' ? 'ANTIGUO' : criterioOrden === 'ANTIGUO' ? 'MONTO' : 'PRIORIDAD')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/80 flex items-center gap-1 transition-all"
                title="Cambiar orden"
              >
                <SlidersHorizontal className="w-3 h-3 text-zinc-500" />
                <span>
                  {criterioOrden === 'PRIORIDAD' && 'Prioridad'}
                  {criterioOrden === 'ANTIGUO' && 'Antigüedad'}
                  {criterioOrden === 'MONTO' && 'Mayor Monto'}
                </span>
              </button>
            </div>

            {/* Buscador y Filtro */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar pedido, cliente, ciudad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroTipo('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                    filtroTipo === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Todos ({pedidos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('MOSTRADOR')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1 ${
                    filtroTipo === 'MOSTRADOR'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  Mostrador ({pedidos.filter(p => p.es_mostrador).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('NORMAL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
                    filtroTipo === 'NORMAL'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Ruta Normal ({pedidos.filter(p => !p.es_mostrador).length})
                </button>
              </div>
            </div>

            {/* Lista de Pedidos */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                  <p className="text-xs font-mono">Cargando pedidos confirmados...</p>
                </div>
              ) : pedidosFiltrados.length === 0 ? (
                /* Estado Vacío Limpio y Directo (Sin textos largos ni botones innecesarios) */
                <div className="py-8 text-center bg-zinc-50/60 rounded-2xl border border-dashed border-zinc-200 p-4">
                  <CheckCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-zinc-600">No hay pedidos pendientes por asignar</p>
                </div>
              ) : (
                pedidosFiltrados.map((p) => {
                  const isSelected = selectedPedido?.id === p.id;
                  const totalItems = p.items_reales_count || p.total_items || 0;
                  const totalGs = Number(p.valor_total || 0).toLocaleString('es-PY');

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPedido(p);
                        if (!selectedSeparadorId) {
                          const sepLibre = separadores.find(s => s.libre);
                          if (sepLibre) setSelectedSeparadorId(sepLibre.id);
                        }
                      }}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-sm text-zinc-900">
                              #{p.num_pedido}
                            </span>
                            {p.es_mostrador ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-100 text-red-700 border border-red-300 flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />
                                MOSTRADOR
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600">
                                RUTA
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              CONFIRMADO
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-zinc-800 mt-1 truncate">
                            {p.cliente_nombre || 'Cliente sin nombre'}
                          </h4>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {p.cliente_ciudad || 'Ciudad no especificada'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-black text-zinc-900 block">
                            Gs. {totalGs}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 inline-block mt-1">
                            {totalItems} items
                          </span>
                        </div>
                      </div>

                      {/* Footer con info de crédito */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                        <div className="flex items-center gap-1.5 truncate">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            Aprobó: <strong className="text-zinc-700">{p.supervisor_aprobador_nombre || 'Supervisor'}</strong>
                          </span>
                        </div>
                        {p.fecha_aprobacion_credito && (
                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                            {formatDatePY(p.fecha_aprobacion_credito, true)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Asignador O Plantel de Separadores Directo */}
        <div className="lg:col-span-7 space-y-5">
          {selectedPedido ? (
            /* ============================================================ */
            /* CASO 1: ASIGNADOR EN CURSO CON PEDIDO SELECCIONADO           */
            /* ============================================================ */
            <div className="bg-white border-2 border-blue-500/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
              {/* Header de Selección Activa */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                    <span className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wider">
                      Asignando Pedido
                    </span>
                    {selectedPedido.es_mostrador && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        Mostrador
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-black text-xl sm:text-2xl text-zinc-900 mt-1">
                    Pedido #{selectedPedido.num_pedido}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {selectedPedido.cliente_nombre} • {selectedPedido.cliente_ciudad || 'Sin zona'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base sm:text-lg font-mono font-black text-zinc-900 block">
                    Gs. {Number(selectedPedido.valor_total || 0).toLocaleString('es-PY')}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    {selectedPedido.items_reales_count || selectedPedido.total_items || 0} ítems en nota
                  </span>
                </div>
              </div>

              {/* PASO: SELECCIONAR SEPARADOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-bold text-zinc-900">
                      Seleccionar Separador
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {libresCount} disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {separadores.map((sep) => {
                    const isLibre = sep.libre;
                    const isSelected = selectedSeparadorId === sep.id;
                    const transcurrido = sep.notaActual?.transcurrido_seg || 0;
                    const mins = Math.floor(transcurrido / 60);

                    return (
                      <button
                        type="button"
                        key={sep.id}
                        onClick={() => setSelectedSeparadorId(sep.id)}
                        className={`p-3 rounded-2xl border text-left transition-all relative flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                            : isLibre
                            ? 'bg-zinc-50/80 hover:bg-emerald-50/50 border-zinc-200 hover:border-emerald-300 text-zinc-900'
                            : 'bg-zinc-100/50 border-zinc-200 text-zinc-600 hover:border-zinc-300 opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isLibre
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-zinc-200 text-zinc-700'
                          }`}>
                            {sep.nombre.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h5 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                              {sep.nombre}
                            </h5>
                            {isLibre ? (
                              <span className={`text-[10px] font-mono flex items-center gap-1 font-semibold ${
                                isSelected ? 'text-blue-100' : 'text-emerald-600'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Libre
                              </span>
                            ) : (
                              <span className={`text-[10px] font-mono truncate block ${
                                isSelected ? 'text-blue-200' : 'text-amber-700'
                              }`}>
                                En #{sep.notaActual?.num_pedido} ({mins}m)
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BOTÓN MAESTRO DE ACCIÓN */}
              <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPedido(null);
                    setSelectedSeparadorId(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  Cancelar Selección
                </button>

                <button
                  type="button"
                  disabled={!selectedSeparadorId || asignando}
                  onClick={ejecutarAsignacion}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                    !selectedSeparadorId || asignando
                      ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {asignando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Iniciando Picking en PDA...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>
                        Asignar e Iniciar Picking {selectedSeparadorId ? `a ${separadores.find(s => s.id === selectedSeparadorId)?.nombre}` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* CASO 2: SIN PEDIDO -> PLANTEL DE SEPARADORES DIRECTO         */
            /* ============================================================ */
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 shadow-sm space-y-4">
              {/* Barra de Filtros de Separadores Directa (Sin títulos rimbombantes ni pestañas innecesarias) */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiltroPlantel('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      filtroPlantel === 'ALL'
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    Todos ({separadores.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPlantel('LIBRES')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      filtroPlantel === 'LIBRES'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Libres ({libresCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPlantel('OCUPADOS')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      filtroPlantel === 'OCUPADOS'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    En Picking ({ocupadosCount})
                  </button>
                </div>

                <span className="text-xs text-zinc-400 font-mono">
                  {ocupadosCount} notas en pasillos
                </span>
              </div>

              {/* Cuadrícula Directa de Separadores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
                {separadores
                  .filter(sep => {
                    if (filtroPlantel === 'LIBRES') return sep.libre;
                    if (filtroPlantel === 'OCUPADOS') return !sep.libre;
                    return true;
                  })
                  .map((sep) => {
                    const isLibre = sep.libre;
                    const notaActiva = sep.notaActual;
                    const transcurridoSeg = notaActiva?.transcurrido_seg || 0;
                    const esDemorado = transcurridoSeg > 2100; // más de 35 minutos

                    return (
                      <div
                        key={sep.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          !isLibre
                            ? esDemorado
                              ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                              : 'bg-blue-50/40 border-blue-200 shadow-xs'
                            : 'bg-zinc-50/60 border-zinc-200/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              !isLibre
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {sep.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-zinc-900 truncate">
                                {sep.nombre}
                              </h4>
                              <span className="text-[10px] font-mono text-zinc-400 block">
                                Cód: {sep.codigo}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                            isLibre
                              ? 'bg-emerald-100 text-emerald-800'
                              : esDemorado
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isLibre ? 'Libre' : 'En Picking'}
                          </span>
                        </div>

                        {!isLibre && notaActiva && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-200/60 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono font-bold text-zinc-800">
                                Nota #{notaActiva.num_pedido}
                              </span>
                              <span className={`font-mono text-[10px] font-bold ${
                                esDemorado ? 'text-amber-700' : 'text-blue-700'
                              }`}>
                                ⏱ {formatSegundos(transcurridoSeg)}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate">
                              {notaActiva.cliente_nombre || 'Cliente'}
                            </p>
                          </div>
                        )}

                        {isLibre && (
                          <div className="mt-2 pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>Disponible para nota</span>
                            <span className="text-emerald-600 font-bold">100% OK</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
