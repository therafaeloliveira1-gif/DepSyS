import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  Settings, 
  Wifi, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Crown
} from 'lucide-react';
import { 
  fetchOperarios, 
  loginSeparador, 
  getServerHost, 
  setServerHost 
} from '../services/api';

export default function OperatorSelector({ onSelectOperator, currentOperator }) {
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  // Modal de Configuración de Servidor
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [serverHostInput, setServerHostInput] = useState('');
  const [configSavedMsg, setConfigSavedMsg] = useState('');

  // Autocompletado de Separadores
  const [separadores, setSeparadores] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const pinInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputContainerRef = useRef(null);

  useEffect(() => {
    cargarSeparadores();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        inputContainerRef.current && 
        !inputContainerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function cargarSeparadores() {
    try {
      const res = await fetchOperarios('SEPARADOR');
      if (res.success && res.operarios) {
        setSeparadores(res.operarios);
      }
    } catch (err) {
      console.error('Error precargando separadores:', err);
    }
  }

  // Filtrar sugerencias reactivas
  const sugerencias = usuario.trim().length >= 1
    ? separadores.filter(s => {
        const query = usuario.trim().toLowerCase();
        return s.nombre.toLowerCase().includes(query) || s.codigo.toLowerCase().includes(query);
      })
    : [];

  function handleSelectSuggestion(s) {
    setUsuario(s.nombre);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setTimeout(() => {
      pinInputRef.current?.focus();
    }, 50);
  }

  function handleKeyDownUsuario(e) {
    if (!showSuggestions || sugerencias.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < sugerencias.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : sugerencias.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < sugerencias.length) {
        e.preventDefault();
        handleSelectSuggestion(sugerencias[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const usuarioLimpio = usuario.trim();
    const pinLimpio = pin.trim();

    if (!usuarioLimpio || !pinLimpio) {
      triggerError('Por favor ingresa tu nombre de separador y PIN.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setShowSuggestions(false);

    try {
      const res = await loginSeparador(usuarioLimpio, pinLimpio);

      if (res.success && res.operario) {
        onSelectOperator(res.operario);
      } else {
        triggerError('Credenciales incorrectas o separador inactivo.');
      }
    } catch (err) {
      triggerError('Error de red conectando al servidor de picking.');
    } finally {
      setLoading(false);
    }
  }

  function triggerError(msg) {
    setErrorMsg(msg);
    setShake(true);
    setPin('');
    setTimeout(() => setShake(false), 500);
  }

  function handleSaveServerHost(e) {
    e.preventDefault();
    setServerHost(serverHostInput.trim());
    setConfigSavedMsg('Servidor guardado con éxito');
    setTimeout(() => {
      setShowConfigModal(false);
      setConfigSavedMsg('');
      cargarSeparadores();
    }, 900);
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-zinc-900 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Fondo estético con iluminación sutil corporativa en modo claro */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Botón Flotante Superior de Configuración del Servidor */}
      <button 
        type="button"
        onClick={() => {
          setServerHostInput(getServerHost());
          setShowConfigModal(true);
        }}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-700 shadow-sm transition-colors z-20"
        title="Configurar IP del Servidor"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Contenedor de Login */}
      <div className="w-full max-w-sm z-10">
        {/* Branding Central Motos Mendes */}
        <div className="text-center mb-8">
          <img 
            src="/depsys-icon.svg" 
            alt="DepSyS" 
            className="inline-block w-20 h-20 rounded-2xl shadow-xl shadow-red-600/30 mb-3 object-contain transform hover:scale-105 transition-transform" 
          />
          <div className="flex items-center justify-center gap-2">
            <span className="font-heading font-black tracking-tight text-[#e60000] text-2xl">MOTOS</span>
            <span className="font-heading font-black tracking-tight text-zinc-900 text-2xl">MENDES</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">DEPSYS</span>
            <span className="text-zinc-400">•</span>
            <span className="text-xs text-zinc-500 font-medium">Separador Móvil</span>
          </div>
        </div>

        {/* Tarjeta de Autenticación en Fondo Claro */}
        <div className={`bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-zinc-200/70 transition-all duration-200 ${
          shake ? 'animate-shake border-red-600 ring-2 ring-red-600/30' : ''
        }`}>
          <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#e60000]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-black text-zinc-900">Inicio de Sesión</h2>
              <p className="text-[11px] text-zinc-500">Ingresa tus credenciales autorizadas</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo 1: Nombre o Código con Autocompletado */}
            <div ref={inputContainerRef} className="relative">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
                <span>Nombre o Código</span>
                {showSuggestions && sugerencias.length > 0 && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {sugerencias.length} sugerencia{sugerencias.length > 1 ? 's' : ''}
                  </span>
                )}
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="off"
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value);
                    setShowSuggestions(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => {
                    if (usuario.trim().length >= 1) setShowSuggestions(true);
                  }}
                  onKeyDown={handleKeyDownUsuario}
                  placeholder="Nombre De Usuario"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-[#e60000] focus:ring-2 focus:ring-red-600/10 transition-all"
                />
              </div>

              {/* Menú Flotante de Sugerencias */}
              {showSuggestions && sugerencias.length > 0 && (
                <div 
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-1.5 z-50 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-[10px] text-zinc-400 px-3 py-1 block uppercase font-bold tracking-wider">
                    Sugerencias encontradas:
                  </span>
                  {sugerencias.map((s, idx) => {
                    const isHighlighted = idx === highlightedIndex;

                    return (
                      <button
                        key={s.codigo}
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-sans transition-all flex items-center justify-between ${
                          isHighlighted
                            ? 'bg-[#e60000] text-white shadow-md'
                            : 'hover:bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isHighlighted ? 'bg-red-800 text-white' : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {s.nombre.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold block truncate">{s.nombre}</span>
                            <span className={`text-[10px] font-mono ${isHighlighted ? 'text-red-100' : 'text-zinc-500'}`}>
                              {s.codigo}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Campo 2: Clave PIN de Acceso */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Clave PIN de Acceso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  ref={pinInputRef}
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={8}
                  autoComplete="current-password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Clave De Acceso"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50/80 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-[#e60000] focus:ring-2 focus:ring-red-600/10 transition-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mensaje de Error */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#e60000] hover:bg-[#cc0000] active:bg-[#b30000] text-white rounded-xl text-xs font-heading font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>INGRESAR AL SISTEMA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Seguro y Limpio */}
        <div className="text-center mt-8 text-xs text-zinc-500">
          <span>&copy; {new Date().getFullYear()} Motos Mendes • Sistema de Control de Depósito</span>
        </div>
      </div>

      {/* Modal de Configuración de Servidor en Fondo Claro */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-zinc-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-[#e60000]">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-zinc-900 text-base">Host del Servidor</h3>
                <p className="text-xs text-zinc-500">Dirección IP o URL de la API DepSyS</p>
              </div>
            </div>

            <form onSubmit={handleSaveServerHost} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={serverHostInput}
                  onChange={(e) => setServerHostInput(e.target.value)}
                  placeholder="http://192.168.1.154/api"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:border-[#e60000]"
                />
              </div>

              {configSavedMsg && (
                <div className="text-xs text-emerald-600 font-medium">
                  {configSavedMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#e60000] hover:bg-[#cc0000] text-white rounded-lg text-xs font-bold shadow-md shadow-red-600/30"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
