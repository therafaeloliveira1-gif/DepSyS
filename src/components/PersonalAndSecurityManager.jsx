import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  KeyRound, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  Lock, 
  Save, 
  Crown, 
  AlertTriangle, 
  Check, 
  X, 
  Sparkles,
  Sliders,
  CheckSquare,
  Truck,
  Layers
} from 'lucide-react';
import { 
  fetchTodosOperarios, 
  fetchSuggestedCodigo, 
  guardarOperario, 
  toggleActivoOperario, 
  resetPinOperario 
} from '../services/api';
import { formatDatePY } from '../utils/formatters';
import { 
  MODULOS_SISTEMA, 
  FUNCIONES_ROLES, 
  getModulosPermitidos 
} from '../utils/permisos';

export default function PersonalAndSecurityManager({ supervisorActual = null }) {
  const [loading, setLoading] = useState(true);
  const [operarios, setOperarios] = useState([]);
  const [stats, setStats] = useState({});
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS'); // 'TODOS' | 'ACTIVOS' | 'INACTIVOS'
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalPinOpen, setModalPinOpen] = useState(false);
  const [modalPermisosOpen, setModalPermisosOpen] = useState(false);
  
  // Usuario seleccionado para edición de permisos
  const [selectedOperario, setSelectedOperario] = useState(null);
  const [editRol, setEditRol] = useState('DISTRIBUIDOR');
  const [editPermisos, setEditPermisos] = useState({});
  const [editPin, setEditPin] = useState('');
  const [editMesaCodigo, setEditMesaCodigo] = useState('');
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  // Formulario nuevo usuario
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRol, setNuevoRol] = useState('DISTRIBUIDOR');
  const [nuevoPin, setNuevoPin] = useState('1234');
  const [nuevoActivo, setNuevoActivo] = useState(1);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);

  // Formulario reset PIN
  const [selectedOperarioForPin, setSelectedOperarioForPin] = useState(null);
  const [nuevoPinVal, setNuevoPinVal] = useState('');

  const esMaestro = supervisorActual?.codigo === 'SUP008' || supervisorActual?.rol === 'ADMIN';

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      const resOps = await fetchTodosOperarios();
      if (resOps.success && resOps.operarios) {
        setOperarios(resOps.operarios);
        setStats(resOps.stats || {});
      }
    } catch (err) {
      console.error('Error cargando personal:', err);
      mostrarFeedback('Error al conectar con la base de datos', 'error');
    } finally {
      setLoading(false);
    }
  }

  function mostrarFeedback(texto, tipo = 'success') {
    setFeedbackMsg({ texto, tipo });
    setTimeout(() => setFeedbackMsg(null), 4000);
  }

  // Abrir modal de permisos y función al hacer clic en un usuario
  function handleSelectOperarioParaPermisos(op) {
    setSelectedOperario(op);
    setEditRol(op.rol || 'SEPARADOR');
    setEditPin(op.pin || '1234');
    setEditMesaCodigo(op.mesa_codigo || '');

    // Mapear los permisos actuales del operario
    const modulosPermitidos = getModulosPermitidos(op);
    const permisosMap = {};
    MODULOS_SISTEMA.forEach(m => {
      permisosMap[m.id] = modulosPermitidos.includes(m.id);
    });
    setEditPermisos(permisosMap);
    setModalPermisosOpen(true);
  }

  // Al cambiar la función/rol dentro del modal de permisos, sugerir permisos por defecto
  function handleCambioFuncionModal(rolId) {
    setEditRol(rolId);
    const rolInfo = FUNCIONES_ROLES.find(r => r.id === rolId);
    if (rolInfo) {
      const nuevosPermisos = {};
      MODULOS_SISTEMA.forEach(m => {
        nuevosPermisos[m.id] = rolInfo.defaultModules.includes(m.id);
      });
      setEditPermisos(nuevosPermisos);
    }
  }

  function togglePermisoModulo(moduloId) {
    if (selectedOperario?.codigo === 'SUP008' || editRol === 'ADMIN') {
      mostrarFeedback('El Administrador Maestro mantiene acceso total permanente', 'error');
      return;
    }
    setEditPermisos(prev => ({
      ...prev,
      [moduloId]: !prev[moduloId]
    }));
  }

  function handleSetAllPermisos(enable) {
    if (selectedOperario?.codigo === 'SUP008' || editRol === 'ADMIN') return;
    const actualizados = {};
    MODULOS_SISTEMA.forEach(m => {
      actualizados[m.id] = enable;
    });
    setEditPermisos(actualizados);
  }

  async function handleGuardarPermisosYRol(e) {
    e.preventDefault();
    if (!selectedOperario) return;

    setGuardandoPermisos(true);
    try {
      const payload = {
        codigo: selectedOperario.codigo,
        nombre: selectedOperario.nombre,
        rol: editRol,
        pin: editPin.trim() || selectedOperario.pin || '1234',
        activo: selectedOperario.activo ?? 1,
        mesa_codigo: editMesaCodigo ? editMesaCodigo.trim() : null,
        permisos_custom: editPermisos
      };

      const res = await guardarOperario(payload);
      if (res.success) {
        mostrarFeedback(`Permisos y función actualizados para ${selectedOperario.nombre}`);
        setModalPermisosOpen(false);

        // Actualizar en el estado local de la tabla
        setOperarios(prev => prev.map(item => {
          if (item.codigo === selectedOperario.codigo) {
            return {
              ...item,
              rol: editRol,
              pin: editPin.trim() || item.pin,
              mesa_codigo: editMesaCodigo ? editMesaCodigo.trim() : null,
              permisos_custom: editPermisos
            };
          }
          return item;
        }));
      } else {
        mostrarFeedback(res.error || 'Error al guardar permisos', 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarFeedback('Error de comunicación con el servidor', 'error');
    } finally {
      setGuardandoPermisos(false);
    }
  }

  // Abrir modal de nuevo usuario y sugerir código automático
  async function abrirModalNuevo() {
    setNuevoRol('DISTRIBUIDOR');
    setNuevoNombre('');
    setNuevoPin('1234');
    setNuevoActivo(1);
    setModalNuevoOpen(true);
    try {
      const res = await fetchSuggestedCodigo('DISTRIBUIDOR');
      if (res.success && res.codigo_sugerido) {
        setNuevoCodigo(res.codigo_sugerido);
      }
    } catch (e) {
      setNuevoCodigo('');
    }
  }

  // Cambio de rol en el modal para sugerir nuevo prefijo
  async function handleCambioRolModalNuevo(rol) {
    setNuevoRol(rol);
    try {
      const res = await fetchSuggestedCodigo(rol);
      if (res.success && res.codigo_sugerido) {
        setNuevoCodigo(res.codigo_sugerido);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleGuardarNuevoUsuario(e) {
    e.preventDefault();
    if (!nuevoCodigo.trim() || !nuevoNombre.trim()) {
      mostrarFeedback('Código y nombre completo son obligatorios', 'error');
      return;
    }
    setGuardandoUsuario(true);
    try {
      const rolInfo = FUNCIONES_ROLES.find(r => r.id === nuevoRol);
      const permisosIniciales = {};
      MODULOS_SISTEMA.forEach(m => {
        permisosIniciales[m.id] = rolInfo ? rolInfo.defaultModules.includes(m.id) : false;
      });

      const res = await guardarOperario({
        codigo: nuevoCodigo.trim().toUpperCase(),
        nombre: nuevoNombre.trim(),
        rol: nuevoRol,
        pin: nuevoPin.trim() || '1234',
        activo: nuevoActivo,
        permisos_custom: permisosIniciales
      });

      if (res.success) {
        mostrarFeedback(`Usuario ${nuevoCodigo} registrado exitosamente con función ${nuevoRol}`);
        setModalNuevoOpen(false);
        await cargarDatos();
      } else {
        mostrarFeedback(res.error || 'No se pudo guardar el usuario', 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarFeedback('Error de comunicación con el servidor', 'error');
    } finally {
      setGuardandoUsuario(false);
    }
  }

  async function handleToggleActivo(e, op) {
    e.stopPropagation(); // Evitar abrir el modal de permisos al tocar el switch de activo
    if (op.codigo === 'SUP008') {
      mostrarFeedback('El usuario maestro SUP008 no puede ser desactivado', 'error');
      return;
    }
    try {
      const res = await toggleActivoOperario(op.codigo);
      if (res.success) {
        mostrarFeedback(`Estado de ${op.nombre} actualizado (${res.activo === 1 ? 'Activo' : 'Inactivo'})`);
        setOperarios(prev => prev.map(item => item.codigo === op.codigo ? { ...item, activo: res.activo } : item));
      } else {
        mostrarFeedback(res.error || 'Error al cambiar estado', 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarFeedback('Error al actualizar estado', 'error');
    }
  }

  function abrirModalResetPin(e, op) {
    e.stopPropagation();
    setSelectedOperarioForPin(op);
    setNuevoPinVal('');
    setModalPinOpen(true);
  }

  async function handleGuardarNuevoPin(e) {
    e.preventDefault();
    if (!nuevoPinVal || nuevoPinVal.length < 4) {
      mostrarFeedback('El PIN debe tener al menos 4 dígitos numéricos', 'error');
      return;
    }
    try {
      const res = await resetPinOperario(selectedOperarioForPin.codigo, nuevoPinVal.trim());
      if (res.success) {
        mostrarFeedback(`PIN actualizado exitosamente para ${selectedOperarioForPin.codigo}`);
        setModalPinOpen(false);
        setOperarios(prev => prev.map(item => item.codigo === selectedOperarioForPin.codigo ? { ...item, pin: nuevoPinVal.trim() } : item));
      } else {
        mostrarFeedback(res.error || 'Error al actualizar PIN', 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarFeedback('Error al resetear PIN', 'error');
    }
  }

  // Filtrado de la tabla de personal
  const operariosFiltrados = operarios.filter(op => {
    const nombre = String(op.nombre || '').toLowerCase();
    const codigo = String(op.codigo || '').toLowerCase();
    const q = filtroTexto.toLowerCase().trim();
    const matchTexto = !q || nombre.includes(q) || codigo.includes(q);
    
    let matchRol = true;
    if (filtroRol !== 'TODOS') {
      if (filtroRol === 'SUPERVISOR') {
        matchRol = (op.rol === 'SUPERVISOR' || op.rol === 'ADMIN');
      } else {
        matchRol = (op.rol === filtroRol);
      }
    }

    return matchTexto && matchRol;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Mensaje flotante de feedback */}
      {feedbackMsg && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300 ${
          feedbackMsg.tipo === 'error' 
            ? 'bg-red-950/90 border-red-800 text-red-200' 
            : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
        }`}>
          {feedbackMsg.tipo === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span>{feedbackMsg.texto}</span>
        </div>
      )}

      {/* Header Principal con Métricas Rápidas (Sin textos infantiles redundantes) */}
      <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#e60000] shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-black text-zinc-900 tracking-tight flex items-center gap-2">
                Personal y Permisos de Acceso
                <span className="text-xs bg-red-50 border border-red-200 text-red-700 font-sans px-2.5 py-0.5 rounded-full font-bold">
                  DepSyS Core
                </span>
              </h1>
            </div>
          </div>

          {/* Botón Alta de Nuevo Personal */}
          <button
            onClick={abrirModalNuevo}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-red-600/20 transition-all self-start lg:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario / Operario</span>
          </button>
        </div>

        {/* Tarjetas de Resumen Numérico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-100">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Total Registrados</span>
            <div className="text-2xl font-heading font-black text-zinc-900 mt-0.5">{stats.total ?? operarios.length}</div>
            <span className="text-[10px] text-zinc-400">Personal en base de datos</span>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4">
            <span className="text-[11px] text-indigo-700 uppercase tracking-wider font-semibold">Distribuidores / Picking</span>
            <div className="text-2xl font-heading font-black text-indigo-800 mt-0.5">
              {stats.distribuidores_activos ?? operarios.filter(o => o.rol === 'DISTRIBUIDOR' && Number(o.activo) === 1).length}
            </div>
            <span className="text-[10px] text-indigo-600">Asignadores de pedidos</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4">
            <span className="text-[11px] text-emerald-700 uppercase tracking-wider font-semibold">Separadores</span>
            <div className="text-2xl font-heading font-black text-emerald-800 mt-0.5">
              {stats.separadores_activos ?? operarios.filter(o => o.rol === 'SEPARADOR').length}
            </div>
            <span className="text-[10px] text-emerald-600">Picking en pasillos</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4">
            <span className="text-[11px] text-amber-700 uppercase tracking-wider font-semibold">Supervisores & Admin</span>
            <div className="text-2xl font-heading font-black text-amber-800 mt-0.5">
              {stats.supervisores_activos ?? operarios.filter(o => o.rol === 'SUPERVISOR' || o.rol === 'ADMIN').length}
            </div>
            <span className="text-[10px] text-amber-600">Control operativo total</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white border border-zinc-200/90 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o código (ej: SEP201, Julio, SUP008)..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-red-600 transition-colors"
            />
          </div>

          {/* Filtro Rol */}
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:outline-none focus:bg-white focus:border-red-600"
          >
            <option value="TODOS">Todas las Funciones</option>
            <option value="DISTRIBUIDOR">Distribuidores de Pedidos</option>
            <option value="SUPERVISOR">Supervisores y Admin</option>
            <option value="SEPARADOR">Separadores</option>
            <option value="GUARDADOR">Mesas / Empaque</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios estilo ERP con Clic para Configurar Permisos */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Nombre Completo</th>
                <th className="py-3.5 px-4">Función Asignada</th>
                <th className="py-3.5 px-4">Permisos Activos</th>
                <th className="py-3.5 px-4">PIN</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium">
              {operariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-zinc-500">
                    No se encontraron usuarios con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                operariosFiltrados.map((op) => {
                  const isMaster = op.codigo === 'SUP008';
                  const permitidos = getModulosPermitidos(op);
                  const rolInfo = FUNCIONES_ROLES.find(r => r.id === op.rol) || {
                    label: op.rol,
                    badgeColor: 'bg-zinc-100 border-zinc-200 text-zinc-700'
                  };

                  return (
                    <tr 
                      key={op.id || op.codigo} 
                      onClick={() => handleSelectOperarioParaPermisos(op)}
                      className={`hover:bg-red-50/40 cursor-pointer transition-colors group ${
                        isMaster ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : ''
                      }`}
                      title="Haz clic para modificar la función y activar/desactivar permisos"
                    >
                      {/* Código */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                            {op.codigo}
                          </span>
                          {isMaster && (
                            <span className="flex items-center gap-1 text-[10px] bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded-lg font-bold uppercase tracking-wider">
                              <Crown className="w-3 h-3 text-amber-600" />
                              Master
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="py-3.5 px-4">
                        <span className="text-zinc-900 font-bold group-hover:text-red-700 transition-colors">
                          {op.nombre}
                        </span>
                        {op.created_at && (
                          <span className="block text-[10px] text-zinc-400 font-mono">
                            Alta: {formatDatePY(op.created_at)}
                          </span>
                        )}
                      </td>

                      {/* Rol / Función & Bancada */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase border ${rolInfo.badgeColor}`}>
                            {op.rol === 'DISTRIBUIDOR' && <Truck className="w-3 h-3" />}
                            {rolInfo.label}
                          </span>
                          {op.mesa_codigo && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Layers className="w-3 h-3 text-blue-500" />
                              Mesa {op.mesa_codigo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Módulos Habilitados */}
                      <td className="py-3.5 px-4">
                        {isMaster || op.rol === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            Acceso Total (9 Módulos)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                              {permitidos.length} {permitidos.length === 1 ? 'módulo' : 'módulos'}
                            </span>
                            <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                              {permitidos.map(id => {
                                const mod = MODULOS_SISTEMA.find(m => m.id === id);
                                return mod ? mod.label.split('/')[0].trim() : id;
                              }).slice(0, 2).join(', ')}
                              {permitidos.length > 2 && '...'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* PIN */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 text-[11px]">
                          {op.pin || '••••'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleSelectOperarioParaPermisos(op)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-[#e60000] border border-red-200 rounded-lg text-[11px] font-bold transition-colors"
                            title="Configurar función y permisos"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Permisos</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => abrirModalResetPin(e, op)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg text-[11px] text-zinc-700 hover:text-zinc-900 transition-colors"
                            title="Cambiar PIN"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CONFIGURAR FUNCIÓN Y PERMISOS DEL USUARIO               */}
      {/* ============================================================== */}
      {modalPermisosOpen && selectedOperario && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200/90 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Cabecera */}
            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white font-bold shadow-md shadow-red-600/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-black text-zinc-900 flex items-center gap-2">
                    Configurar Función y Permisos
                    <span className="font-mono text-xs bg-zinc-200 px-2 py-0.5 rounded text-zinc-800 font-bold">
                      {selectedOperario.codigo}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 font-semibold">{selectedOperario.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPermisosOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-xl hover:bg-zinc-200/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <form onSubmit={handleGuardarPermisosYRol} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Sección 1: Asignar Función Principal */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    1. Asignar Función Operativa
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Define la identidad y vista por defecto
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {FUNCIONES_ROLES.map(r => {
                    const isSelected = editRol === r.id;
                    const esAdminMaestro = selectedOperario.codigo === 'SUP008';

                    return (
                      <button
                        type="button"
                        key={r.id}
                        disabled={esAdminMaestro && r.id !== 'ADMIN'}
                        onClick={() => handleCambioFuncionModal(r.id)}
                        className={`p-3 rounded-2xl text-left border transition-all relative ${
                          isSelected
                            ? 'bg-red-50/80 border-red-500 ring-2 ring-red-500/20 shadow-sm'
                            : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700'
                        } ${esAdminMaestro && r.id !== 'ADMIN' ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-900">{r.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-red-600 stroke-[3]" />}
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-tight">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Mesa / Bancada Física Asignada */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Bancada de Empaque Asignada
                    </label>
                  </div>
                  <span className="text-[11px] text-blue-700 font-mono">
                    {editMesaCodigo ? `Asignado a Mesa ${editMesaCodigo}` : 'Sin bancada fija'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mb-3">
                  Al iniciar sesión en la app de escritorio, este operario entrará directamente a operar esta mesa física.
                </p>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-blue-100">
                  <button
                    type="button"
                    onClick={() => setEditMesaCodigo('')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                      !editMesaCodigo
                        ? 'bg-zinc-800 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border-zinc-200'
                    }`}
                  >
                    Ninguna
                  </button>
                  {Array.from({ length: 19 }, (_, i) => String(301 + i)).map(mesa => (
                    <button
                      key={mesa}
                      type="button"
                      onClick={() => setEditMesaCodigo(mesa)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        editMesaCodigo === mesa
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-white text-zinc-700 hover:bg-blue-50 hover:text-blue-700 border-zinc-200'
                      }`}
                    >
                      Mesa {mesa}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección 2: Matriz de Permisos Individuales */}
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">
                      2. Permisos Específicos por Módulo
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      Activa o desactiva qué pantallas verá este usuario al iniciar sesión
                    </span>
                  </div>

                  {editRol !== 'ADMIN' && selectedOperario.codigo !== 'SUP008' && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSetAllPermisos(true)}
                        className="text-red-700 font-bold hover:underline"
                      >
                        Marcar Todos
                      </button>
                      <span className="text-zinc-300">•</span>
                      <button
                        type="button"
                        onClick={() => handleSetAllPermisos(false)}
                        className="text-zinc-500 font-medium hover:text-zinc-800"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  )}
                </div>

                {/* Lista de Módulos con Switches */}
                <div className="space-y-2">
                  {MODULOS_SISTEMA.map(m => {
                    const isChecked = Boolean(editPermisos[m.id]);
                    const esAdminMaestro = selectedOperario.codigo === 'SUP008' || editRol === 'ADMIN';

                    return (
                      <div
                        key={m.id}
                        onClick={() => !esAdminMaestro && togglePermisoModulo(m.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          esAdminMaestro 
                            ? 'bg-purple-50/40 border-purple-200 cursor-not-allowed'
                            : isChecked
                            ? 'bg-red-50/40 border-red-200 hover:bg-red-50/70 cursor-pointer'
                            : 'bg-zinc-50/60 border-zinc-200 hover:bg-zinc-100/80 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isChecked || esAdminMaestro
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-200 text-zinc-500'
                          }`}>
                            {isChecked || esAdminMaestro ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-zinc-900 block">{m.label}</span>
                            <span className="text-[11px] text-zinc-500">{m.desc}</span>
                          </div>
                        </div>

                        {/* Switch visual */}
                        <div className="flex items-center gap-2">
                          {m.id === 'ASSIGN_PICKING' && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">
                              Distribución
                            </span>
                          )}
                          <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                            esAdminMaestro
                              ? 'bg-purple-200 cursor-not-allowed'
                              : isChecked
                              ? 'bg-red-600'
                              : 'bg-zinc-300'
                          }`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              isChecked || esAdminMaestro ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección 3: PIN de Acceso */}
              <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">
                    3. Clave PIN de Acceso
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    PIN numérico utilizado para iniciar sesión en la terminal
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                    className="w-28 px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-xl text-center font-mono font-bold text-sm tracking-widest text-zinc-900 focus:outline-none focus:border-red-600"
                  />
                  <button
                    type="button"
                    onClick={() => setEditPin(String(Math.floor(1000 + Math.random() * 9000)))}
                    className="p-2 text-zinc-500 hover:text-amber-600 hover:bg-zinc-100 rounded-xl transition-colors"
                    title="Generar PIN aleatorio"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Botones de Guardar */}
              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setModalPermisosOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPermisos}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{guardandoPermisos ? 'Guardando en Base de Datos...' : 'Guardar Función y Permisos'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRAR NUEVO USUARIO / OPERARIO                     */}
      {/* ============================================================== */}
      {modalNuevoOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200/90 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-black text-zinc-900">Alta de Personal DepSyS</h3>
                  <p className="text-[11px] text-zinc-500">Registro directo en MySQL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoUsuario} className="p-6 space-y-4">
              {/* Rol */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Función / Rol Operativo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FUNCIONES_ROLES.filter(r => r.id !== 'ADMIN').map(r => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => handleCambioRolModalNuevo(r.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                        nuevoRol === r.id
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Código Sugerido */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
                  <span>Código de Empleado</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">Auto-sugerido</span>
                </label>
                <input
                  type="text"
                  required
                  value={nuevoCodigo}
                  onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: DST001"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:bg-white focus:border-red-600"
                />
              </div>

              {/* Nombre y Apellido */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre y Apellido del operario"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:bg-white focus:border-red-600"
                />
              </div>

              {/* PIN de 4 dígitos */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
                  <span>PIN Numérico</span>
                  <button
                    type="button"
                    onClick={() => setNuevoPin(String(Math.floor(1000 + Math.random() * 9000)))}
                    className="text-[10px] text-amber-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    Aleatorio
                  </button>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1234"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:bg-white focus:border-red-600 text-center tracking-widest text-sm"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoUsuario}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{guardandoUsuario ? 'Guardando...' : 'Dar de Alta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESETEAR PIN DE OPERARIO                               */}
      {/* ============================================================== */}
      {modalPinOpen && selectedOperarioForPin && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200/90 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-black text-zinc-900">Cambiar PIN</h3>
                  <p className="text-[11px] text-zinc-500">{selectedOperarioForPin.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPinOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoPin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
                  <span>Nuevo PIN</span>
                  <button
                    type="button"
                    onClick={() => setNuevoPinVal(String(Math.floor(1000 + Math.random() * 9000)))}
                    className="text-[10px] text-amber-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generar
                  </button>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={nuevoPinVal}
                  onChange={(e) => setNuevoPinVal(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 5678"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-center font-mono font-bold text-base tracking-widest text-zinc-900 focus:outline-none focus:bg-white focus:border-red-600"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalPinOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Actualizar PIN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
