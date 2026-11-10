import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Search, 
  Package, 
  Clock, 
  ArrowRight, 
  AlertCircle, 
  User, 
  Sparkles,
  RefreshCw,
  Bell,
  Star,
  LogOut,
  X,
  ShieldCheck
} from 'lucide-react';
import { fetchNotas, fetchPedidoReal, iniciarPicking } from '../services/api';

// Textura SVG de ruido al 30% para acabado analógico sobre gradientes
const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export default function OrderQueue({ operario, onStartPicking, onChangeOperator, isGlobalPaused = false }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const searchInputRef = useRef(null);

  // 1. Cronómetro de picking en vivo: SOLO corre si hay una nota asignada en curso
  const [elapsedMs, setElapsedMs] = useState(0);

  // 2. Tiempo total de sesión/turno (para auditoría y modal de perfil de usuario)
  const [sessionStartTime] = useState(() => {
    const key = `depsys_session_start_${operario?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved && !isNaN(Number(saved))) return Number(saved);
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
  });

  const [segundosTurno, setSegundosTurno] = useState(() => {
    return Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSegundosTurno(Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  useEffect(() => {
    cargarPedidos(true);
    // Polling en vivo cada 3.5 segundos para detectar notas recién asignadas por el supervisor
    const interval = setInterval(() => {
      cargarPedidos(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [operario?.id]);

  async function cargarPedidos(showLoading = false) {
    if (showLoading) setLoading(true);
    const res = await fetchNotas();
    if (res.success && res.notas) {
      setPedidos(res.notas);
    }
    if (showLoading) setLoading(false);
  }

  // Filtrar notas: Exclusivamente notas asignadas al operario actual
  const misAsignados = pedidos.filter(
    n => n.separador_id === operario.id && ['PENDIENTE', 'SEPARANDO'].includes(n.estado)
  );

  // Nota actualmente en picking (SEPARANDO)
  const notaEnCurso = misAsignados.find(n => n.estado === 'SEPARANDO');

  // Actualizador del cronómetro de picking: SOLO avanza si hay nota asignada en curso y NO hay pausa
  useEffect(() => {
    if (isGlobalPaused) return; // Congelado si hay pausa global del depósito

    if (!notaEnCurso || !notaEnCurso.inicio_separacion) {
      setElapsedMs(0);
      return;
    }

    const tInicio = new Date(notaEnCurso.inicio_separacion).getTime();
    if (isNaN(tInicio)) {
      setElapsedMs(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      setElapsedMs(Math.max(0, now - tInicio));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 50); // 50ms para centésimas de segundo fluidas
    return () => clearInterval(timer);
  }, [notaEnCurso?.id, notaEnCurso?.inicio_separacion, isGlobalPaused]);

  // Desglose de dígitos para las 3 tarjetas 3D (MIN : SEC : MS)
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minDigits = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secDigits = String(totalSeconds % 60).padStart(2, '0');
  const msDigits = String(Math.floor((elapsedMs % 1000) / 10)).padStart(2, '0');

  function formatTimer(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Reanudar automáticamente si el separador ya tiene una nota en picking al abrir la app
  const autoResumedRef = useRef(false);
  useEffect(() => {
    if (!autoResumedRef.current && misAsignados.length > 0) {
      const enCurso = misAsignados.find(n => n.estado === 'SEPARANDO');
      if (enCurso) {
        autoResumedRef.current = true;
        console.log('Reanudación automática de nota en curso al abrir la app:', enCurso.num_pedido);
        handleSelectExisting(enCurso);
      }
    }
  }, [misAsignados]);

  // Búsqueda en vivo en Firebird cuando el operario escanea el código de barras de la orden física
  async function handleSearchOrScan(e) {
    if (e) e.preventDefault();
    const query = searchCode.trim();
    if (!query) return;

    setSearchingRemote(true);
    setErrorMessage('');

    try {
      // 1. Consultar pedido real en Firebird ERP
      const res = await fetchPedidoReal(query);
      if (!res.success) {
        setErrorMessage(res.error || `Pedido N° ${query} no encontrado en SGLoja.`);
        setSearchingRemote(false);
        return;
      }

      // 2. Iniciar picking inmediatamente
      const notaId = res.pedido.id_deposito;
      await iniciarPicking(notaId, operario.id);

      // Pasar a la pantalla de picking
      onStartPicking({
        ...res.pedido,
        items: res.items || res.pedido.items
      });
    } catch (err) {
      setErrorMessage('Error al consultar SGLoja: ' + err.message);
    } finally {
      setSearchingRemote(false);
    }
  }

  async function handleSelectExisting(nota) {
    setLoading(true);
    try {
      await iniciarPicking(nota.id, operario.id);
      const res = await fetchPedidoReal(nota.num_pedido);
      if (res.success && res.pedido) {
        onStartPicking({
          ...res.pedido,
          id: nota.id,
          id_deposito: nota.id,
          num_pedido: nota.num_pedido,
          items: res.items || res.pedido.items
        });
      } else {
        onStartPicking({
          id: nota.id,
          id_deposito: nota.id,
          num_pedido: nota.num_pedido,
          cliente_nombre: nota.cliente_nombre,
          cliente_ciudad: nota.cliente_ciudad,
          items: []
        });
      }
    } catch (err) {
      console.error('Error al tomar pedido existente:', err);
      alert('Error al iniciar pedido: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4 select-none">
      {/* Barra Superior: [Botón Perfil Usuario (Verde)] + [Cronómetro Imponente Neumórfico (MIN : SEC : MS)] */}
      <div className="flex items-center gap-2 mb-2">
        {/* 1. Botón Perfil de Usuario con Avatar */}
        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="relative w-14 sm:w-16 self-stretch min-h-[66px] bg-white hover:bg-zinc-50 border border-zinc-200/90 rounded-2xl flex items-center justify-center shadow-[3px_4px_10px_rgba(0,0,0,0.06),-2px_-2px_6px_rgba(255,255,255,0.9)] transition-all active:scale-95 shrink-0 group"
          title="Ver perfil de usuario y opciones"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-600 via-[#e60000] to-[#b30000] text-white flex items-center justify-center font-heading font-black text-sm sm:text-base shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform">
            {operario.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          {/* Indicador verde de operario en línea */}
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"></span>
        </button>

        {/* 2. Cronómetro Imponente 3D Neumórfico (MIN : SEC : MS) con degrade rojo y ruido 30% */}
        <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Card MIN */}
          <div className="relative overflow-hidden bg-white border border-zinc-100 rounded-2xl py-2 px-1 flex flex-col items-center justify-center shadow-[4px_6px_14px_rgba(0,0,0,0.06),-3px_-3px_8px_rgba(255,255,255,0.95)]">
            {/* Textura de Ruido ~30% encima del gradiente */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-10"
              style={{ backgroundImage: NOISE_BG }}
            />
            <span className="font-heading font-black text-2xl sm:text-3xl tracking-tight leading-none bg-gradient-to-b from-[#ff2a2a] via-[#e60000] to-[#800000] bg-clip-text text-transparent relative z-0">
              {minDigits}
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold tracking-widest text-[#cc0000]/70 uppercase mt-1 relative z-0">
              MIN
            </span>
          </div>

          {/* Card SEC */}
          <div className="relative overflow-hidden bg-white border border-zinc-100 rounded-2xl py-2 px-1 flex flex-col items-center justify-center shadow-[4px_6px_14px_rgba(0,0,0,0.06),-3px_-3px_8px_rgba(255,255,255,0.95)]">
            {/* Textura de Ruido ~30% encima del gradiente */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-10"
              style={{ backgroundImage: NOISE_BG }}
            />
            <span className="font-heading font-black text-2xl sm:text-3xl tracking-tight leading-none bg-gradient-to-b from-[#ff2a2a] via-[#e60000] to-[#800000] bg-clip-text text-transparent relative z-0">
              {secDigits}
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold tracking-widest text-[#cc0000]/70 uppercase mt-1 relative z-0">
              SEC
            </span>
          </div>

          {/* Card MS */}
          <div className="relative overflow-hidden bg-white border border-zinc-100 rounded-2xl py-2 px-1 flex flex-col items-center justify-center shadow-[4px_6px_14px_rgba(0,0,0,0.06),-3px_-3px_8px_rgba(255,255,255,0.95)]">
            {/* Textura de Ruido ~30% encima del gradiente */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-10"
              style={{ backgroundImage: NOISE_BG }}
            />
            <span className="font-heading font-black text-2xl sm:text-3xl tracking-tight leading-none bg-gradient-to-b from-[#ff2a2a] via-[#e60000] to-[#800000] bg-clip-text text-transparent relative z-0">
              {msDigits}
            </span>
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold tracking-widest text-[#cc0000]/70 uppercase mt-1 relative z-0">
              MS
            </span>
          </div>
        </div>
      </div>

      {/* Indicador de Estado: Solo corre con nota asignada / En espera (Tiempo Muerto) */}
      <div className="flex items-center justify-between px-1 mb-2.5 text-[11px] font-mono">
        <span className="font-bold tracking-tight flex items-center gap-1.5 truncate">
          {isGlobalPaused ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></span>
              <span className="text-amber-800 font-black">
                ⏸️ JORNADA PAUSADA POR SUPERVISOR
              </span>
            </>
          ) : notaEnCurso ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
              <span className="text-emerald-700 font-black">
                ⚡ Picking Nota #{notaEnCurso.num_pedido}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-zinc-300 shrink-0"></span>
              <span className="text-zinc-400">
                ⏸️ Sin nota asignada • Registrando tiempo muerto
              </span>
            </>
          )}
        </span>
        {operario?.codigo && (
          <span className="text-zinc-400 font-bold shrink-0 ml-2">
            {operario.codigo}
          </span>
        )}
      </div>

      {/* Modal de Perfil de Usuario */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white border border-zinc-200 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-[#cc0000] text-white flex items-center justify-center font-heading font-black text-lg shadow-md shadow-red-600/30">
                  {operario.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                    {operario.codigo || 'SEPARADOR'}
                  </span>
                  <h3 className="font-heading font-black text-base text-zinc-900 mt-1 leading-tight">
                    {operario.nombre}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Datos de la Sesión */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 space-y-2.5 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Función:</span>
                <span className="font-bold text-zinc-800">Separador de Pedidos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Tiempo en turno:</span>
                <span className="font-mono font-bold text-zinc-900">{formatTimer(segundosTurno)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Pedidos asignados:</span>
                <span className="font-mono font-bold text-red-600">{misAsignados.length} pedidos</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onChangeOperator();
                }}
                className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-[#e60000] border border-red-200 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all tap-active"
              >
                <LogOut className="w-4 h-4" />
                <span>Cambiar de Separador / Salir</span>
              </button>

              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-heading font-bold text-xs transition-all tap-active"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input de Escáner Láser de Hoja de Pedido */}
      <div className="mb-3">
        <form onSubmit={handleSearchOrScan} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Barcode className="w-5 h-5 text-[#e60000]" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            inputMode="numeric"
            value={searchCode}
            onChange={e => setSearchCode(e.target.value)}
            placeholder="Escanear N° de Nota o Pedido..."
            className="w-full pl-11 pr-24 py-3 bg-white border border-zinc-200 rounded-2xl text-zinc-900 font-mono text-sm placeholder-zinc-400 focus:outline-none focus:border-[#e60000] focus:ring-1 focus:ring-[#e60000] shadow-sm transition-colors"
          />
          <button
            type="submit"
            disabled={searchingRemote || !searchCode.trim()}
            className="absolute inset-y-1.5 right-1.5 px-3.5 bg-[#e60000] hover:bg-[#cc0000] text-white rounded-xl font-heading font-bold text-xs tap-active disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all"
          >
            {searchingRemote ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Cargar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {errorMessage && (
          <div className="mt-2.5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-700 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>


      {/* Lista Desplazable de Notas Asignadas */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading && misAsignados.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-28 rounded-2xl shimmer"></div>
            ))}
          </div>
        ) : misAsignados.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white border border-zinc-200 rounded-3xl shadow-sm">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
            <h4 className="font-heading font-bold text-zinc-800 text-base mb-1">
              No tienes notas asignadas
            </h4>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              El supervisor te asignará pedidos, o puedes escanear la hoja física con tu colector.
            </p>
          </div>
        ) : (
          misAsignados.map(nota => {
            const isSeparando = nota.estado === 'SEPARANDO';
            const esMio = nota.separador_id === operario.id;

            return (
              <div
                key={nota.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSeparando
                    ? 'bg-red-50/70 border-[#e60000] shadow-md shadow-red-500/10'
                    : esMio
                    ? 'bg-white border-red-200 shadow-sm'
                    : 'bg-white border-zinc-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#e60000] tracking-wider">
                        NOTA #{nota.num_pedido}
                      </span>
                      {esMio && (
                        <span className="text-[9px] bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded-md font-mono font-bold">
                          ASIGNADO
                        </span>
                      )}
                    </div>
                    <h4 className="font-heading font-bold text-zinc-900 text-sm mt-0.5 line-clamp-1">
                      {nota.cliente_nombre}
                    </h4>
                    {nota.cliente_ciudad && (
                      <p className="text-[11px] text-zinc-500">{nota.cliente_ciudad}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isSeparando
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse-subtle'
                      : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}>
                    {nota.estado}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono py-2 border-y border-zinc-100 my-2.5">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{nota.total_items} repuestos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                    <span className="font-bold text-zinc-800">{nota.total_piezas} piezas</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectExisting(nota)}
                  className="w-full py-2.5 px-4 bg-[#e60000] hover:bg-[#cc0000] text-white rounded-xl font-heading font-bold text-xs tap-active flex items-center justify-center gap-2 shadow-md shadow-red-600/30 transition-all"
                >
                  <span>{isSeparando ? 'CONTINUAR SEPARACIÓN' : 'INICIAR SEPARACIÓN'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
