import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  User, 
  DollarSign, 
  ShieldAlert, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  Percent,
  TrendingDown,
  X,
  AlertCircle,
  Layers,
  Flame,
  Check,
  Building,
  Hash,
  Package,
  Eye,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Hourglass,
  GripVertical
} from 'lucide-react';
import { 
  fetchPedidosPendientesFirebird, 
  fetchDetallePedidoFirebird, 
  aprobarPedidoCredito, 
  retenerPedidoCredito, 
  rechazarPedidoCredito,
  fetchPedidosConfirmados,
  fetchPedidosEnEspera
} from '../services/api';
import { formatDatePY } from '../utils/formatters';

export default function CreditApprovalPanel({ 
  supervisorActual,
  onPedidoAprobado = () => {} 
}) {
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [pedidosEnEspera, setPedidosEnEspera] = useState([]);
  const [pedidosConfirmados, setPedidosConfirmados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('ALL'); // 'ALL' | 'MOSTRADOR' | 'RUTA'

  // Drag & Drop Moxen State
  const [draggedPedido, setDraggedPedido] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null); // 'espera' | 'confirmado'

  // Modal de Detalle / Inspección de Pedido
  const [modalPedidoId, setModalPedidoId] = useState(null);
  const [detalleCargado, setDetalleCargado] = useState({});
  const [loadingDetalleId, setLoadingDetalleId] = useState(null);
  const [modalItems, setModalItems] = useState([]);
  const [modalItemsOriginales, setModalItemsOriginales] = useState([]);

  // Acciones en curso
  const [actionLoading, setActionLoading] = useState(false);
  const [comentarioAccion, setComentarioAccion] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const searchInputRef = useRef(null);

  useEffect(() => {
    cargarTodosLosDatos(true);
    const interval = setInterval(() => {
      cargarTodosLosDatos(false);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Atajos de teclado: '/' enfoca búsqueda, 'Escape' cierra modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !modalPedidoId) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && modalPedidoId) {
        cerrarModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalPedidoId]);

  async function cargarTodosLosDatos(showLoading = false) {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const [resPend, resEsp, resConf] = await Promise.all([
        fetchPedidosPendientesFirebird(60),
        fetchPedidosEnEspera(),
        fetchPedidosConfirmados()
      ]);

      if (resPend && resPend.success && Array.isArray(resPend.pedidos)) {
        // Excluir de pendientes los que ya están en espera o confirmados localmente
        const idsEspera = new Set((resEsp?.pedidos || []).map(p => String(p.num_pedido)));
        const idsConf = new Set((resConf?.pedidos || []).map(p => String(p.num_pedido)));
        setPedidosPendientes(resPend.pedidos.filter(p => !idsEspera.has(String(p.num_pedido)) && !idsConf.has(String(p.num_pedido))));
      }
      if (resEsp && resEsp.success && Array.isArray(resEsp.pedidos)) {
        setPedidosEnEspera(resEsp.pedidos);
      }
      if (resConf && resConf.success && Array.isArray(resConf.pedidos)) {
        setPedidosConfirmados(resConf.pedidos);
      }
    } catch (err) {
      console.error('Error cargando pedidos en tablero:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function abrirModalPedido(numPedido) {
    setModalPedidoId(numPedido);
    setComentarioAccion('');

    if (detalleCargado[numPedido]) {
      const its = detalleCargado[numPedido].items || [];
      setModalItems(JSON.parse(JSON.stringify(its)));
      setModalItemsOriginales(JSON.parse(JSON.stringify(its)));
    } else {
      setLoadingDetalleId(numPedido);
      try {
        const res = await fetchDetallePedidoFirebird(numPedido);
        if (res.success && res.pedido) {
          setDetalleCargado(prev => ({ ...prev, [numPedido]: res.pedido }));
          const its = res.pedido.items || [];
          setModalItems(JSON.parse(JSON.stringify(its)));
          setModalItemsOriginales(JSON.parse(JSON.stringify(its)));
        }
      } catch (err) {
        console.error('Error cargando detalle de pedido:', err);
      } finally {
        setLoadingDetalleId(null);
      }
    }
  }

  function handlePrecioChange(index, nuevoPrecio) {
    const pUnit = Math.max(0, parseFloat(nuevoPrecio) || 0);
    setModalItems(prev => {
      const clone = [...prev];
      const it = { ...clone[index] };
      it.precio_unitario = pUnit;
      const cant = Number(it.cantidad || 1);
      const pDesc = Number(it.porcentaje_descuento || 0);
      it.subtotal = Math.round(cant * pUnit * (1 - (pDesc / 100)));
      clone[index] = it;
      return clone;
    });
  }

  function handleDescuentoChange(index, nuevoDesc) {
    const pDesc = Math.min(100, Math.max(0, parseFloat(nuevoDesc) || 0));
    setModalItems(prev => {
      const clone = [...prev];
      const it = { ...clone[index] };
      it.porcentaje_descuento = pDesc;
      const cant = Number(it.cantidad || 1);
      const pUnit = Number(it.precio_unitario || it.precio_lista || 0);
      it.subtotal = Math.round(cant * pUnit * (1 - (pDesc / 100)));
      clone[index] = it;
      return clone;
    });
  }

  function handleEliminarItem(index) {
    setModalItems(prev => prev.filter((_, i) => i !== index));
  }

  function handleRestablecerItems() {
    setModalItems(JSON.parse(JSON.stringify(modalItemsOriginales)));
  }

  function cerrarModal() {
    setModalPedidoId(null);
    setComentarioAccion('');
    setModalItems([]);
    setModalItemsOriginales([]);
  }

  // --- ACCIÓN: APROBAR PEDIDO (Mover a Confirmado) ---
  async function ejecutarAprobacion(numPedido, comentario = '') {
    setActionLoading(true);
    try {
      const res = await aprobarPedidoCredito({
        numPedido,
        supervisorId: supervisorActual?.id || supervisorActual?.codigo || null,
        supervisorNombre: supervisorActual?.nombre || 'Supervisor Comercial',
        comentario: comentario || 'Aprobado comercialmente para depósito',
        itemsModificados: itemsHanCambiado ? modalItems : undefined
      });

      if (res.success) {
        showToast(`✅ Pedido #${numPedido} aprobado y enviado a Confirmados.`, 'success');
        cerrarModal();
        await cargarTodosLosDatos(false);
        onPedidoAprobado();
      } else {
        showToast('Error al aprobar: ' + (res.error || 'Desconocido'), 'error');
      }
    } catch (err) {
      showToast('Error de conexión: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // --- ACCIÓN: PASAR A EN ESPERA (Retener / Observación) ---
  async function ejecutarPonerEnEspera(numPedido, motivo = '') {
    setActionLoading(true);
    try {
      const res = await retenerPedidoCredito({
        numPedido,
        supervisorId: supervisorActual?.id || supervisorActual?.codigo || null,
        supervisorNombre: supervisorActual?.nombre || 'Supervisor Comercial',
        motivo: motivo || 'Puesto en espera para evaluación crediticia'
      });

      if (res.success) {
        showToast(`⏳ Pedido #${numPedido} movido a "En Espera".`, 'warning');
        cerrarModal();
        await cargarTodosLosDatos(false);
      } else {
        showToast('Error: ' + (res.error || 'Desconocido'), 'error');
      }
    } catch (err) {
      showToast('Error de conexión: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRechazar(numPedido) {
    const motivo = prompt('Ingresa el motivo de rechazo del pedido:', 'Cancelado por solicitud del cliente');
    if (!motivo) return;
    setActionLoading(true);
    try {
      const res = await rechazarPedidoCredito({
        numPedido,
        supervisorId: supervisorActual?.id || supervisorActual?.codigo || null,
        supervisorNombre: supervisorActual?.nombre || 'Supervisor Comercial',
        motivo
      });

      if (res.success) {
        showToast(`❌ Pedido #${numPedido} RECHAZADO y cancelado.`, 'error');
        cerrarModal();
        await cargarTodosLosDatos(false);
      } else {
        showToast('Error al rechazar: ' + (res.error || 'Desconocido'), 'error');
      }
    } catch (err) {
      showToast('Error de conexión: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function showToast(text, type = 'success') {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 5000);
  }

  // =========================================================================
  // LOGICA DRAG & DROP ESTILO MOXEN (SOLO ADELANTE: Pendiente -> Espera -> Confirmado)
  // =========================================================================
  function handleDragStart(e, pedido, origenCol) {
    setDraggedPedido({ pedido, origenCol });
    e.dataTransfer.setData('text/plain', JSON.stringify({ numPedido: pedido.num_pedido, origenCol }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, destinoCol) {
    e.preventDefault();
    if (!draggedPedido) return;
    const { origenCol } = draggedPedido;

    // Regla estricta: Solo hacia adelante, nunca hacia atrás
    // 1. De 'pendiente' se puede mover a 'espera' o a 'confirmado'
    // 2. De 'espera' solo se puede mover a 'confirmado'
    // 3. De 'confirmado' ya no se puede mover a ninguna otra
    let esValido = false;
    if (origenCol === 'pendiente' && (destinoCol === 'espera' || destinoCol === 'confirmado')) {
      esValido = true;
    } else if (origenCol === 'espera' && destinoCol === 'confirmado') {
      esValido = true;
    }

    if (esValido) {
      e.dataTransfer.dropEffect = 'move';
      if (dragOverCol !== destinoCol) setDragOverCol(destinoCol);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }

  function handleDragLeave(e, destinoCol) {
    if (dragOverCol === destinoCol) {
      setDragOverCol(null);
    }
  }

  async function handleDrop(e, destinoCol) {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedPedido) return;

    const { pedido, origenCol } = draggedPedido;
    setDraggedPedido(null);

    // Validar transición permitida
    if (origenCol === 'pendiente' && destinoCol === 'espera') {
      await ejecutarPonerEnEspera(pedido.num_pedido, 'Movido a En espera desde el Tablero');
    } else if ((origenCol === 'pendiente' || origenCol === 'espera') && destinoCol === 'confirmado') {
      await ejecutarAprobacion(pedido.num_pedido, 'Aprobado y Confirmado por arrastre en Tablero');
    }
  }

  // Filtrado de pedidos según texto y tipo
  function aplicarFiltro(lista) {
    return lista.filter(p => {
      if (filtroTipo === 'MOSTRADOR' && !p.es_mostrador) return false;
      if (filtroTipo === 'RUTA' && p.es_mostrador) return false;

      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      const matchNum = String(p.num_pedido || '').toLowerCase().includes(q);
      const matchCli = String(p.cliente_nombre || '').toLowerCase().includes(q);
      const matchRuc = String(p.cliente_ruc || p.cliente_doc || '').toLowerCase().includes(q);
      const matchCiu = String(p.cliente_ciudad || '').toLowerCase().includes(q);
      return matchNum || matchCli || matchRuc || matchCiu;
    });
  }

  const pendientesFiltrados = useMemo(() => {
    const list = aplicarFiltro(pedidosPendientes);
    return [...list].sort((a, b) => {
      const da = new Date(a.fecha_pedido).getTime();
      const db = new Date(b.fecha_pedido).getTime();
      if (!isNaN(da) && !isNaN(db) && da !== db) return da - db;
      return Number(a.num_pedido || 0) - Number(b.num_pedido || 0);
    });
  }, [pedidosPendientes, searchTerm, filtroTipo]);

  const esperaFiltrados = useMemo(() => {
    const list = aplicarFiltro(pedidosEnEspera);
    return [...list].sort((a, b) => {
      const da = new Date(a.fecha_ingreso || a.fecha_pedido).getTime();
      const db = new Date(b.fecha_ingreso || b.fecha_pedido).getTime();
      if (!isNaN(da) && !isNaN(db) && da !== db) return da - db;
      return Number(a.num_pedido || 0) - Number(b.num_pedido || 0);
    });
  }, [pedidosEnEspera, searchTerm, filtroTipo]);

  const confirmadosFiltrados = useMemo(() => {
    const list = aplicarFiltro(pedidosConfirmados);
    return [...list].sort((a, b) => {
      const da = new Date(a.fecha_aprobacion_credito || a.fecha_ingreso).getTime();
      const db = new Date(b.fecha_aprobacion_credito || b.fecha_ingreso).getTime();
      if (!isNaN(da) && !isNaN(db) && da !== db) return db - da;
      return Number(b.num_pedido || 0) - Number(a.num_pedido || 0);
    });
  }, [pedidosConfirmados, searchTerm, filtroTipo]);

  const totalMostrador = pedidosPendientes.filter(p => p.es_mostrador).length +
    pedidosEnEspera.filter(p => p.es_mostrador).length +
    pedidosConfirmados.filter(p => p.es_mostrador).length;

  const pedidoModal = modalPedidoId 
    ? (pedidosPendientes.find(p => String(p.num_pedido) === String(modalPedidoId)) ||
       pedidosEnEspera.find(p => String(p.num_pedido) === String(modalPedidoId)) ||
       pedidosConfirmados.find(p => String(p.num_pedido) === String(modalPedidoId)))
    : null;
  const detalleModal = modalPedidoId ? (detalleCargado[modalPedidoId] || pedidoModal) : null;
  const clienteModal = detalleModal?.cliente || {};
  const esConfirmadoModal = pedidosConfirmados.some(p => String(p.num_pedido) === String(modalPedidoId));
  const esEsperaModal = pedidosEnEspera.some(p => String(p.num_pedido) === String(modalPedidoId));

  const totalPiezasModal = useMemo(() => {
    if (modalItems.length > 0) {
      return modalItems.reduce((acc, it) => acc + Number(it.cantidad || 0), 0);
    }
    return Number(pedidoModal?.total_piezas || 0);
  }, [modalItems, pedidoModal]);

  const totalGsModal = useMemo(() => {
    if (modalItems.length > 0) {
      return modalItems.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
    }
    return Number(pedidoModal?.valor_total || 0);
  }, [modalItems, pedidoModal]);

  const itemsHanCambiado = useMemo(() => {
    if (modalItemsOriginales.length === 0) return false;
    if (modalItems.length !== modalItemsOriginales.length) return true;
    return modalItems.some((it, i) => {
      const orig = modalItemsOriginales[i];
      if (!orig) return true;
      return Number(it.precio_unitario) !== Number(orig.precio_unitario) ||
             Number(it.porcentaje_descuento) !== Number(orig.porcentaje_descuento) ||
             Number(it.cantidad) !== Number(orig.cantidad);
    });
  }, [modalItems, modalItemsOriginales]);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200 select-none">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-md transition-all animate-in slide-in-from-top-2 ${
          toastMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          toastMsg.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' :
          'bg-red-50 border-red-300 text-red-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-xs sm:text-sm font-bold">{toastMsg.text}</p>
          </div>
          <button 
            onClick={() => setToastMsg(null)}
            className="text-xs font-bold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ── 1. CABECERA LIMPIA (Moxen Tablero Header) ── */}
      <div className="bg-white border border-zinc-200/90 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight">
                Tablero de Pedidos
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                {pedidosPendientes.length + pedidosEnEspera.length + pedidosConfirmados.length} en flujo
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Arrastra las tarjetas entre columnas: <strong>Pendiente → En espera → Confirmado</strong> (o directo a Confirmado). Nunca hacia atrás.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap">
            {/* Filtros de Tipo */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFiltroTipo('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filtroTipo === 'ALL'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('MOSTRADOR')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  filtroTipo === 'MOSTRADOR'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Mostrador ({totalMostrador})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('RUTA')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filtroTipo === 'RUTA'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Ruta Normal
              </button>
            </div>

            {/* Buscador Rápido */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Buscar pedido, cliente... (/)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-7 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all font-medium"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botón Sincronizar SGLoja */}
            <button
              type="button"
              onClick={() => cargarTodosLosDatos(true)}
              disabled={loading || refreshing}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
              title="Consultar pedidos en vivo desde Firebird SGLoja"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin text-red-400' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TABLERO MOXEN: 3 COLUMNAS (PENDIENTE, EN ESPERA, CONFIRMADO) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        
        {/* ========================================================= */}
        {/* COLUMNA 1: PENDIENTES                                     */}
        {/* ========================================================= */}
        <section 
          className="bg-zinc-100/70 border border-zinc-200/90 rounded-3xl p-3.5 sm:p-4 flex flex-col min-h-[580px] shadow-xs"
        >
          <header className="flex items-center justify-between pb-3 mb-2.5 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-zinc-400 bg-white"></span>
              <h2 className="font-heading font-black text-sm text-zinc-900 uppercase tracking-wider">
                1. Pendiente
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white text-zinc-800 border border-zinc-200 shadow-2xs">
              {pendientesFiltrados.length}
            </span>
          </header>

          <div className="space-y-2.5 overflow-y-auto max-h-[660px] pr-1">
            {loading ? (
              <div className="py-16 text-center space-y-2 text-zinc-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400" />
                <p className="text-xs font-mono">Cargando pedidos...</p>
              </div>
            ) : pendientesFiltrados.length === 0 ? (
              <div className="py-16 text-center space-y-1.5 bg-white/60 border border-dashed border-zinc-200 rounded-2xl p-4">
                <CheckCircle2 className="w-6 h-6 text-zinc-400 mx-auto" />
                <p className="text-xs font-bold text-zinc-600">Sin pedidos pendientes</p>
              </div>
            ) : (
              pendientesFiltrados.map((pedido) => {
                const totalPiezas = Number(pedido.total_piezas || pedido.total_items || 0);
                const totalGs = Number(pedido.valor_total || 0).toLocaleString('es-PY');
                const semaforo = pedido.semaforo_credito || pedido.situacion_credito || 'AL_DIA';

                return (
                  <article
                    key={pedido.num_pedido}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pedido, 'pendiente')}
                    onClick={() => abrirModalPedido(pedido.num_pedido)}
                    className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 hover:border-zinc-400 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none relative group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 shrink-0" />
                        <span className="font-mono font-black text-xs sm:text-sm text-zinc-900 group-hover:text-red-600 transition-colors">
                          #{pedido.num_pedido}
                        </span>
                        {pedido.es_mostrador ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-red-50 text-red-700 border border-red-200 flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 text-red-600" />
                            MOST
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-zinc-100 text-zinc-600">
                            RUTA
                          </span>
                        )}
                        {pedido.es_credito ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            CRÉD
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            CONT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-medium text-zinc-500">
                        {formatDatePY(pedido.fecha_pedido, true)}
                      </span>
                    </div>

                    <div className="pt-2 pb-1.5">
                      <h3 className="font-heading font-black text-xs text-zinc-900 leading-snug line-clamp-1 group-hover:text-zinc-950">
                        {pedido.cliente_nombre || 'Cliente sin nombre'}
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5 font-mono">
                        Cód: {pedido.cliente_codigo || '---'} {pedido.cliente_ciudad ? `• ${pedido.cliente_ciudad}` : ''}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs text-zinc-900">
                        Gs. {totalGs}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600">
                          {totalPiezas} pz
                        </span>
                        {semaforo === 'BLOQUEADO' ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                            BLOQ
                          </span>
                        ) : semaforo === 'EN_OBSERVACION' ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            OBS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            AL DÍA
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* COLUMNA 2: EN ESPERA (Retención / Observación / Espera)    */}
        {/* ========================================================= */}
        <section 
          onDragOver={(e) => handleDragOver(e, 'espera')}
          onDragLeave={(e) => handleDragLeave(e, 'espera')}
          onDrop={(e) => handleDrop(e, 'espera')}
          className={`border rounded-3xl p-3.5 sm:p-4 flex flex-col min-h-[580px] shadow-xs transition-colors duration-200 ${
            dragOverCol === 'espera'
              ? 'bg-amber-100/80 border-2 border-dashed border-amber-500 scale-[1.01]'
              : 'bg-zinc-100/70 border-zinc-200/90'
          }`}
        >
          <header className="flex items-center justify-between pb-3 mb-2.5 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-amber-500 bg-amber-400"></span>
              <h2 className="font-heading font-black text-sm text-zinc-900 uppercase tracking-wider">
                2. En Espera
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-white shadow-2xs">
              {esperaFiltrados.length}
            </span>
          </header>

          <div className="space-y-2.5 overflow-y-auto max-h-[660px] pr-1 flex-1">
            {esperaFiltrados.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 bg-white/60 border border-dashed border-zinc-200 rounded-2xl">
                <Hourglass className="w-6 h-6 text-amber-500/70 mb-2" />
                <p className="text-xs font-bold text-zinc-700">Zona de Espera</p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[180px]">
                  Arrastra aquí pedidos desde <strong>Pendiente</strong> para retenerlos u observarlos.
                </p>
              </div>
            ) : (
              esperaFiltrados.map((pedido) => {
                const totalPiezas = Number(pedido.total_piezas || pedido.total_items || 0);
                const totalGs = Number(pedido.valor_total || 0).toLocaleString('es-PY');

                return (
                  <article
                    key={pedido.num_pedido || pedido.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pedido, 'espera')}
                    onClick={() => abrirModalPedido(pedido.num_pedido)}
                    className="p-3.5 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none relative group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-mono font-black text-xs sm:text-sm text-zinc-900 group-hover:text-amber-700 transition-colors">
                          #{pedido.num_pedido}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          EN ESPERA
                        </span>
                        {pedido.es_credito ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            CRÉD
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            CONT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-medium text-zinc-500">
                        {formatDatePY(pedido.fecha_pedido || pedido.fecha_ingreso, true)}
                      </span>
                    </div>

                    <div className="pt-2 pb-1.5">
                      <h3 className="font-heading font-black text-xs text-zinc-900 leading-snug line-clamp-1">
                        {pedido.cliente_nombre || 'Cliente sin nombre'}
                      </h3>
                      <p className="text-[10px] text-amber-700 font-medium truncate mt-0.5 font-mono">
                        {pedido.motivo_retencion || 'En revisión crediticia'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs text-zinc-900">
                        Gs. {totalGs}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600">
                        {totalPiezas} pz
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* COLUMNA 3: CONFIRMADO (Listo para Picking)                 */}
        {/* ========================================================= */}
        <section 
          onDragOver={(e) => handleDragOver(e, 'confirmado')}
          onDragLeave={(e) => handleDragLeave(e, 'confirmado')}
          onDrop={(e) => handleDrop(e, 'confirmado')}
          className={`border rounded-3xl p-3.5 sm:p-4 flex flex-col min-h-[580px] shadow-xs transition-colors duration-200 ${
            dragOverCol === 'confirmado'
              ? 'bg-emerald-100/80 border-2 border-dashed border-emerald-600 scale-[1.01]'
              : 'bg-zinc-100/70 border-zinc-200/90'
          }`}
        >
          <header className="flex items-center justify-between pb-3 mb-2.5 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-emerald-600 bg-emerald-500"></span>
              <h2 className="font-heading font-black text-sm text-zinc-900 uppercase tracking-wider">
                3. Confirmado
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-600 text-white shadow-2xs">
              {confirmadosFiltrados.length}
            </span>
          </header>

          <div className="space-y-2.5 overflow-y-auto max-h-[660px] pr-1 flex-1">
            {confirmadosFiltrados.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 bg-white/60 border border-dashed border-zinc-200 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/70 mb-2" />
                <p className="text-xs font-bold text-zinc-700">Zona de Confirmados</p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[180px]">
                  Arrastra aquí desde <strong>Pendiente</strong> o <strong>En Espera</strong> para autorizar el despacho.
                </p>
              </div>
            ) : (
              confirmadosFiltrados.map((pedido) => {
                const totalPiezas = Number(pedido.total_piezas || pedido.total_items || 0);
                const totalGs = Number(pedido.valor_total || 0).toLocaleString('es-PY');

                return (
                  <article
                    key={pedido.num_pedido || pedido.id}
                    onClick={() => abrirModalPedido(pedido.num_pedido)}
                    className="p-3.5 rounded-2xl bg-white border border-emerald-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer select-none relative group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        <span className="font-mono font-black text-xs sm:text-sm text-zinc-900 group-hover:text-emerald-700 transition-colors">
                          #{pedido.num_pedido}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          AUTORIZADO
                        </span>
                        {pedido.es_credito ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            CRÉD
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            CONT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-medium text-zinc-500">
                        {formatDatePY(pedido.fecha_pedido || pedido.fecha_ingreso, true)}
                      </span>
                    </div>

                    <div className="pt-2 pb-1.5">
                      <h3 className="font-heading font-black text-xs text-zinc-900 leading-snug line-clamp-1">
                        {pedido.cliente_nombre || 'Cliente sin nombre'}
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                        {pedido.cliente_ciudad || 'Ciudad no especificada'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs text-zinc-900">
                        Gs. {totalGs}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {totalPiezas} pz
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

      </div>

      {/* ── 3. MODAL DESGLOSE DE PRODUCTOS Y EVALUACIÓN COMERCIAL ── */}
      {modalPedidoId && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-zinc-200/90 rounded-3xl shadow-2xl w-[98vw] max-w-[1550px] 2xl:max-w-[1750px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono font-black text-xl text-zinc-900">
                  #{pedidoModal?.num_pedido}
                </span>
                <span className="text-zinc-400">•</span>
                <h2 className="font-heading font-black text-base sm:text-lg text-zinc-900 truncate max-w-md">
                  {pedidoModal?.cliente_nombre}
                </h2>

                {/* INDICADOR DE CRÉDITO O CONTADO */}
                {(detalleModal?.es_credito ?? pedidoModal?.es_credito) ? (
                  <span className="px-3 py-1 rounded-xl text-xs font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shadow-2xs">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>A CRÉDITO ({detalleModal?.condicion_pago_nombre || pedidoModal?.condicion_pago_nombre || 'CRÉDITO'})</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-xl text-xs font-mono font-black bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>AL CONTADO ({detalleModal?.condicion_pago_nombre || pedidoModal?.condicion_pago_nombre || 'CONTADO'})</span>
                  </span>
                )}

                {esConfirmadoModal ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Confirmado
                  </span>
                ) : esEsperaModal ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    En Espera
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-200 text-zinc-800">
                    Pendiente
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="w-9 h-9 rounded-full bg-zinc-200/70 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors"
                title="Cerrar modal (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo Scrollable del Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingDetalleId === modalPedidoId ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-600" />
                  <p className="text-sm font-bold text-zinc-800">Cargando productos y situación crediticia...</p>
                  <p className="text-xs text-zinc-400 font-mono">Consultando Firebird ERP</p>
                </div>
              ) : (
                <>
                  {/* Bloque 1: Situación Crediticia del Cliente */}
                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-zinc-700" />
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800">
                          Situación de Crédito del Cliente
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">
                        RUC: {clienteModal?.ruc_cedula || pedidoModal?.cliente_codigo || '---'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="bg-white border border-zinc-200/80 rounded-xl p-3">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">Límite Crédito</span>
                        <span className="font-mono font-black text-sm text-zinc-900">
                          Gs. {Number(clienteModal?.limite_credito || 0).toLocaleString('es-PY')}
                        </span>
                      </div>

                      <div className="bg-white border border-zinc-200/80 rounded-xl p-3">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">Saldo Deudor</span>
                        <span className="font-mono font-black text-sm text-amber-700">
                          Gs. {Number(clienteModal?.saldo_deudor || 0).toLocaleString('es-PY')}
                        </span>
                      </div>

                      <div className="bg-white border border-zinc-200/80 rounded-xl p-3">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">Saldo Disponible</span>
                        <span className="font-mono font-black text-sm text-emerald-700">
                          Gs. {Number(clienteModal?.saldo_disponible || 0).toLocaleString('es-PY')}
                        </span>
                      </div>

                      <div className="bg-white border border-zinc-200/80 rounded-xl p-3">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">Facturas Vencidas</span>
                        <span className={`font-mono font-black text-sm ${Number(clienteModal?.facturas_vencidas_cant || 0) > 0 ? 'text-red-700' : 'text-zinc-700'}`}>
                          {Number(clienteModal?.facturas_vencidas_cant || 0)} vencidas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 2: Lista de Productos Solicitados (Estilo SGLoja ERP - Editable) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-zinc-700" />
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800">
                          Productos Solicitados ({modalItems.length} ítems)
                        </h3>
                        {itemsHanCambiado && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ✏️ Modificado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {itemsHanCambiado && !esConfirmadoModal && (
                          <button
                            type="button"
                            onClick={handleRestablecerItems}
                            className="text-[11px] font-mono font-bold text-red-600 hover:text-red-700 underline"
                          >
                            Restablecer precios y descuentos
                          </button>
                        )}
                        <span className="text-xs font-mono font-bold text-zinc-600">
                          Total Piezas: <strong className="text-zinc-900">{totalPiezasModal}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
                      <div className="overflow-x-auto max-h-[460px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10 bg-zinc-100 border-b border-zinc-200">
                            <tr className="text-[11px] font-mono font-bold text-zinc-600 uppercase tracking-wider">
                              <th className="py-2.5 px-3 text-center w-12 border-r border-zinc-200">Item</th>
                              <th className="py-2.5 px-3 min-w-[260px] border-r border-zinc-200">Producto</th>
                              {!esConfirmadoModal && (
                                <th className="py-2.5 px-2 text-center w-10 border-r border-zinc-200" title="Eliminar ítem">
                                  <span className="sr-only">Acción</span>
                                </th>
                              )}
                              <th className="py-2.5 px-3 text-center w-20 border-r border-zinc-200">Cant. Caja</th>
                              <th className="py-2.5 px-3 text-center w-20 border-r border-zinc-200">Cant.</th>
                              <th className="py-2.5 px-3 text-right w-32 border-r border-zinc-200">Vl. Unitario</th>
                              <th className="py-2.5 px-3 text-center w-24 border-r border-zinc-200">% Desc.</th>
                              <th className="py-2.5 px-3 text-center w-16 border-r border-zinc-200">Lote</th>
                              <th className="py-2.5 px-3 text-right w-32">Vl. Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-800">
                            {modalItems.length === 0 ? (
                              <tr>
                                <td colSpan={esConfirmadoModal ? 8 : 9} className="py-8 text-center text-zinc-400 font-mono text-xs">
                                  No hay ítems cargados para este pedido
                                </td>
                              </tr>
                            ) : (
                              modalItems.map((it, idx) => {
                                const descPct = Number(it.porcentaje_descuento || 0);

                                return (
                                  <tr key={it.sku || it.num_item || idx} className="hover:bg-amber-50/30 transition-colors">
                                    {/* Item # */}
                                    <td className="py-2.5 px-3 text-center font-mono text-zinc-400 border-r border-zinc-100">
                                      {it.num_item || idx + 1}
                                    </td>

                                    {/* Producto: Código + Descripción */}
                                    <td className="py-2.5 px-3 border-r border-zinc-100">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] border border-zinc-200 shrink-0">
                                          {it.sku || it.codigo_barra}
                                        </span>
                                        <span className="font-heading font-bold text-zinc-900 truncate flex-1 min-w-0" title={it.descripcion}>
                                          {it.descripcion}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Botón amarillo [X] para excluir ítem */}
                                    {!esConfirmadoModal && (
                                      <td className="py-2.5 px-2 text-center border-r border-zinc-100">
                                        <button
                                          type="button"
                                          onClick={() => handleEliminarItem(idx)}
                                          className="w-5 h-5 bg-[#fde047] hover:bg-[#facc15] active:scale-95 border border-amber-400 text-blue-950 font-black rounded flex items-center justify-center transition-all shadow-2xs mx-auto"
                                          title="Excluir este producto del pedido"
                                        >
                                          <X className="w-3.5 h-3.5 stroke-[3] text-blue-950" />
                                        </button>
                                      </td>
                                    )}

                                    {/* Cant. Caja */}
                                    <td className="py-2.5 px-3 text-center font-mono text-xs text-zinc-600 border-r border-zinc-100">
                                      {it.cant_caja || 1}
                                    </td>

                                    {/* Cant. (Solo lectura) */}
                                    <td className="py-2.5 px-3 text-center border-r border-zinc-100">
                                      <span className="font-mono font-black text-xs sm:text-sm text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200 inline-block min-w-8">
                                        {it.cantidad}
                                      </span>
                                    </td>

                                    {/* Vl. Unitario (Editable) */}
                                    <td className="py-2 px-3 text-right border-r border-zinc-100">
                                      {esConfirmadoModal ? (
                                        <span className="font-mono text-xs text-zinc-800">
                                          {Number(it.precio_unitario || it.precio_lista || 0).toLocaleString('es-PY')}
                                        </span>
                                      ) : (
                                        <input
                                          type="number"
                                          min="0"
                                          step="50"
                                          value={it.precio_unitario ?? 0}
                                          onChange={(e) => handlePrecioChange(idx, e.target.value)}
                                          className="w-28 px-2 py-1 text-right font-mono font-bold text-xs text-zinc-900 bg-white border border-zinc-300 rounded-lg focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none shadow-2xs ml-auto"
                                          title="Modificar precio unitario"
                                        />
                                      )}
                                    </td>

                                    {/* % Desc. (Editable) */}
                                    <td className="py-2 px-3 text-center border-r border-zinc-100">
                                      {esConfirmadoModal ? (
                                        <span className="font-mono text-xs font-bold text-zinc-700">
                                          {descPct > 0 ? `${descPct}%` : '0%'}
                                        </span>
                                      ) : (
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            value={it.porcentaje_descuento ?? 0}
                                            onChange={(e) => handleDescuentoChange(idx, e.target.value)}
                                            className="w-16 px-1.5 py-1 text-center font-mono font-bold text-xs text-zinc-900 bg-white border border-zinc-300 rounded-lg focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none shadow-2xs"
                                            title="Modificar % de descuento"
                                          />
                                          <span className="text-[10px] text-zinc-400 font-bold">%</span>
                                        </div>
                                      )}
                                    </td>

                                    {/* Lote */}
                                    <td className="py-2.5 px-3 text-center font-mono text-xs text-zinc-400 border-r border-zinc-100">
                                      {it.lote || '—'}
                                    </td>

                                    {/* Vl. Total */}
                                    <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-zinc-900">
                                      {Number(it.subtotal || 0).toLocaleString('es-PY')}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Resumen Totales de la Tabla */}
                      <div className="bg-zinc-50/90 border-t border-zinc-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 text-zinc-600">
                          {Number(pedidoModal?.total_descuento || 0) > 0 && (
                            <span className="text-emerald-700 font-mono font-bold">
                              Descuento total aplicado: -Gs. {Number(pedidoModal.total_descuento).toLocaleString('es-PY')}
                            </span>
                          )}
                          {pedidoModal?.observaciones && (
                            <span className="text-zinc-500 italic max-w-xs truncate" title={pedidoModal.observaciones}>
                              Nota: {pedidoModal.observaciones}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold">Total a Depósito:</span>
                          <span className="font-mono font-black text-xl text-zinc-900">
                            Gs. {Number(totalGsModal || 0).toLocaleString('es-PY')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 3: Comentario del Supervisor (Solo si no está confirmado) */}
                  {!esConfirmadoModal && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 block">
                        Comentario o Instrucción para el Depósito (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Autorizado por Anderson - Despachar con prioridad..."
                        value={comentarioAccion}
                        onChange={(e) => setComentarioAccion(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pie / Acciones del Modal */}
            <div className="px-6 py-4 border-t border-zinc-200/80 bg-zinc-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {!esConfirmadoModal ? (
                <>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!esEsperaModal && (
                      <button
                        type="button"
                        onClick={() => ejecutarPonerEnEspera(pedidoModal.num_pedido, 'Puesto en espera desde modal')}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors disabled:opacity-50"
                      >
                        ⏳ Poner En Espera
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRechazar(pedidoModal.num_pedido)}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-bold text-red-900 bg-red-50 hover:bg-red-100 border border-red-300 transition-colors disabled:opacity-50"
                    >
                      ✕ Rechazar
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={cerrarModal}
                      disabled={actionLoading}
                      className="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => ejecutarAprobacion(pedidoModal.num_pedido, comentarioAccion)}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[3]" />
                      )}
                      <span>Aprobar Pedido</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Este pedido ya fue aprobado y se encuentra listo en la cola de despacho.
                  </span>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-zinc-900 hover:bg-black transition-colors"
                  >
                    Cerrar Detalle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
