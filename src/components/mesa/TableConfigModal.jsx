import React, { useState, useEffect } from 'react';
import { Monitor, Check, X, Layers } from 'lucide-react';
import { fetchMesas } from '../../services/api';

export default function TableConfigModal({ currentMesa, onSaveMesa, onClose }) {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCodigo, setSelectedCodigo] = useState(currentMesa || '');

  useEffect(() => {
    cargarMesas();
  }, []);

  async function cargarMesas() {
    setLoading(true);
    const res = await fetchMesas();
    if (res.success && res.mesas) {
      setMesas(res.mesas);
      if (!currentMesa && res.mesas.length > 0) {
        setSelectedCodigo(res.mesas[0].codigo);
      }
    }
    setLoading(false);
  }

  function handleSave() {
    if (!selectedCodigo) return;
    onSaveMesa(selectedCodigo);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#e60000]">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl text-zinc-900">
                Configurar Bancada Física
              </h3>
              <p className="text-xs text-zinc-500">
                Selecciona la bancada (301 a 319) correspondiente a esta terminal.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-colors tap-active"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-16 rounded-2xl bg-zinc-100 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto py-2 pr-1">
            {mesas.map(m => {
              const isSelected = selectedCodigo === m.codigo;
              return (
                <button
                  type="button"
                  key={m.codigo}
                  onClick={() => setSelectedCodigo(m.codigo)}
                  className={`p-3 rounded-2xl border text-left transition-all tap-active flex items-center justify-between ${
                    isSelected
                      ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20 text-red-900 shadow-sm'
                      : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/80 text-zinc-800'
                  }`}
                >
                  <div>
                    <h4 className="font-heading font-bold text-sm">
                      {m.nombre}
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Código: {m.codigo}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-200 flex items-center justify-end gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedCodigo}
            className="px-6 py-2 rounded-xl bg-[#e60000] hover:bg-[#cc0000] text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 tap-active disabled:opacity-50"
          >
            Fijar en esta Terminal
          </button>
        </div>
      </div>
    </div>
  );
}
