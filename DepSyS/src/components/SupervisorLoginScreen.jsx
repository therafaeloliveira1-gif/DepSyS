import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  User, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Crown
} from 'lucide-react';
import { loginSupervisor, fetchOperarios } from '../services/api';

export default function SupervisorLoginScreen({ onLoginSuccess }) {
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [shake, setShake] = useState(false);

  // Lista de supervisores para autocompletado reactivo
  const [supervisores, setSupervisores] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const pinInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputContainerRef = useRef(null);

  useEffect(() => {
    cargarSupervisores();
  }, []);

  // Cerrar sugerencias al hacer clic fuera
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

  async function cargarSupervisores() {
    try {
      const res = await fetchOperarios();
      if (res && res.success && Array.isArray(res.operarios)) {
        const ordenados = [...res.operarios].sort((a, b) => 
          a.codigo === 'SUP008' ? -1 : b.codigo === 'SUP008' ? 1 : 0
        );
        setSupervisores(ordenados);
      }
    } catch (err) {
      console.error('Error precargando lista de sugerencias:', err);
    }
  }

  // Filtrar sugerencias solo cuando el usuario haya escrito al menos 1 caracter
  const sugerencias = usuario.trim().length >= 1
    ? supervisores.filter(s => {
        const query = usuario.trim().toLowerCase();
        const nom = String(s.nombre || '').toLowerCase();
        const cod = String(s.codigo || '').toLowerCase();
        return nom.includes(query) || cod.includes(query);
      })
    : [];

  function handleSelectSuggestion(sup) {
    setUsuario(sup.nombre);
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
      triggerError('Por favor ingresa tu nombre de usuario y clave PIN.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setShowSuggestions(false);

    try {
      const res = await loginSupervisor(usuarioLimpio, pinLimpio);

      if (res.success && res.supervisor) {
        localStorage.setItem('depsys_auth_supervisor', JSON.stringify(res.supervisor));
        onLoginSuccess(res.supervisor);
      } else {
        triggerError('Credenciales incorrectas o acceso no autorizado.');
      }
    } catch (err) {
      triggerError('Error de conexión con el servicio de autenticación.');
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Fondo estético con iluminación sutil corporativa en modo claro */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

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
            <span className="text-xs text-zinc-500 font-medium">Control de Depósito</span>
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
                  {sugerencias.map((sup, idx) => {
                    const isMaster = sup.codigo === 'SUP008';
                    const isHighlighted = idx === highlightedIndex;

                    return (
                      <button
                        key={sup.codigo}
                        type="button"
                        onClick={() => handleSelectSuggestion(sup)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-sans transition-all flex items-center justify-between ${
                          isHighlighted
                            ? 'bg-[#e60000] text-white shadow-md'
                            : 'hover:bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isMaster 
                              ? 'bg-amber-400 text-black' 
                              : isHighlighted 
                              ? 'bg-red-800 text-white' 
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {isMaster ? <Crown className="w-4 h-4" /> : sup.nombre.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold block truncate">
                              {sup.nombre}
                            </span>
                            <span className={`text-[10px] font-mono ${
                              isHighlighted ? 'text-red-100' : 'text-zinc-500'
                            }`}>
                              {sup.codigo}
                            </span>
                          </div>
                        </div>

                        {isMaster && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            isHighlighted 
                              ? 'bg-white/20 text-white' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            Root
                          </span>
                        )}
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

            {/* Mensaje de Error Seguro */}
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
    </div>
  );
}
