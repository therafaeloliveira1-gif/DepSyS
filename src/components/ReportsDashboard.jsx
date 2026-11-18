import React, { useState, useEffect } from 'react';
import { Download, Calendar, Users, PackageCheck, RefreshCw } from 'lucide-react';
import SeparadoresLeaderboard from './SeparadoresLeaderboard';
import GuardadoresLeaderboard from './GuardadoresLeaderboard';
import { fetchReporteSeparadores, fetchReporteGuardadores, getExportarCsvUrl } from '../services/api';

export default function ReportsDashboard() {
  const [tab, setTab] = useState('separadores');
  const [mes, setMes] = useState('2026-10');
  const [reporteSeparadores, setReporteSeparadores] = useState([]);
  const [reporteGuardadores, setReporteGuardadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarReportes();
  }, [mes]);

  async function cargarReportes() {
    setLoading(true);
    try {
      const [resSep, resGuard] = await Promise.all([
        fetchReporteSeparadores(mes),
        fetchReporteGuardadores(mes)
      ]);

      if (resSep.success) setReporteSeparadores(resSep.reporte || []);
      if (resGuard.success) setReporteGuardadores(resGuard.reporte || []);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleExportarExcel() {
    const url = getExportarCsvUrl(tab, mes);
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-6 select-none">
      {/* Barra de Filtros, Selector de Mes y Exportación */}
      <div className="p-5 bg-white border border-zinc-200/90 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Selector de Pestaña */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200">
          <button
            onClick={() => setTab('separadores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tap-active transition-all ${
              tab === 'separadores'
                ? 'bg-[#e60000] text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Separadores (Picking)</span>
          </button>

          <button
            onClick={() => setTab('guardadores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold tap-active transition-all ${
              tab === 'guardadores'
                ? 'bg-[#e60000] text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Guardadores (Mesas)</span>
          </button>
        </div>

        {/* Selector de Mes y Botón Excel */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-mono">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="bg-transparent text-zinc-900 font-semibold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={cargarReportes}
            className="p-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900 tap-active transition-colors"
            title="Recargar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#e60000]' : ''}`} />
          </button>

          <button
            onClick={handleExportarExcel}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs rounded-2xl flex items-center gap-2 tap-active shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar a Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Contenido Dinámico */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-28 rounded-3xl bg-white border border-zinc-200 animate-pulse"></div>
          <div className="h-64 rounded-3xl bg-white border border-zinc-200 animate-pulse"></div>
        </div>
      ) : tab === 'separadores' ? (
        <SeparadoresLeaderboard reporte={reporteSeparadores} />
      ) : (
        <GuardadoresLeaderboard reporte={reporteGuardadores} />
      )}
    </div>
  );
}
