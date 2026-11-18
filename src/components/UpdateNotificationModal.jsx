import React, { useState } from 'react';
import { ArrowDownCircle, RefreshCw, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { installDesktopUpdate } from '../services/updaterService';

export default function UpdateNotificationModal({ updateInfo, onClose }) {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!updateInfo || !updateInfo.available) return null;

  async function handleUpdate() {
    setInstalling(true);
    setErrorMsg(null);
    try {
      await installDesktopUpdate(updateInfo, (prog) => {
        setProgress(prog);
      });
    } catch (err) {
      console.error('Error aplicando actualización:', err);
      setErrorMsg(err.message || 'Error al descargar o instalar la actualización.');
      setInstalling(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-[#121214] border border-[#27272a] rounded-2xl shadow-2xl p-5 text-white animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/20 flex items-center justify-center text-[#e60000]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                Actualización Lista
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#27272a] text-zinc-300">
                v{updateInfo.version}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-0.5">
              Nueva versión de DepSyS
            </h4>
          </div>
        </div>

        {!installing && (
          <button 
            type="button" 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400 mt-3 line-clamp-2">
        {updateInfo.body || 'Mejoras de rendimiento y correcciones en las terminales del depósito.'}
      </p>

      {/* Barra de Progreso si está descargando */}
      {installing && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#e60000]" />
              Descargando versión...
            </span>
            <span className="font-mono text-white font-bold">
              {progress?.percent ? `${progress.percent}%` : 'Iniciando...'}
            </span>
          </div>
          <div className="w-full bg-[#27272a] rounded-full h-2 overflow-hidden">
            <div 
              className="bg-[#e60000] h-full rounded-full transition-all duration-150"
              style={{ width: `${progress?.percent || 10}%` }}
            ></div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 p-2.5 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Botones de Acción */}
      {!installing && (
        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={handleUpdate}
            className="flex-1 py-2.5 px-4 bg-[#e60000] hover:bg-[#cc0000] active:bg-[#b30000] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Actualizar Ahora</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white rounded-xl text-xs font-medium transition-colors"
          >
            Más tarde
          </button>
        </div>
      )}
    </div>
  );
}

