import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function WindowControls({ className = '' }) {
  const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
  if (!isTauri) return null;

  async function handleMinimize(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('app_minimize');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
      } catch (err) {
        console.warn('Error minimizando ventana:', err);
      }
    }
  }

  async function handleMaximize(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('app_toggle_maximize');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
      } catch (err) {
        console.warn('Error maximizando ventana:', err);
      }
    }
  }

  async function handleClose(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('app_close');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch (err) {
        console.warn('Error cerrando ventana:', err);
      }
    }
  }

  return (
    <div 
      className={`flex items-center gap-1 z-50 select-none ${className}`}
      data-tauri-drag-region="false"
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={handleMinimize}
        className="w-7 h-7 rounded-lg hover:bg-zinc-200/80 active:bg-zinc-300 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        title="Minimizar"
      >
        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={handleMaximize}
        className="w-7 h-7 rounded-lg hover:bg-zinc-200/80 active:bg-zinc-300 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        title="Maximizar / Restaurar"
      >
        <Square className="w-3 h-3 stroke-[2.5]" />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={handleClose}
        className="w-7 h-7 rounded-lg hover:bg-[#e60000] hover:text-white active:bg-[#cc0000] flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-white transition-colors"
        title="Cerrar DepSyS"
      >
        <X className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );
}
