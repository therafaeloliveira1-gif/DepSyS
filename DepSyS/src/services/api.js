export { formatDatePY, formatTimePY } from '../utils/formatters';

export function getApiBase() {
  const saved = localStorage.getItem('depsys_server_host') || localStorage.getItem('depsystem_server_host');
  if (saved && (saved.startsWith('http://') || saved.startsWith('https://'))) {
    return saved.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const h = window.location.hostname;
    const p = window.location.port;
    if (p === '3003' || p === '3000' || p === '5173') {
      return '/api';
    }
    if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.test') || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('26.')) {
      return `http://${h}:3015/api`;
    }
  }
  return '/api';
}

export async function fetchStatus() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/status.php`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/status`);
    return await fb.json();
  } catch (err) {
    try {
      const fb = await fetch(`${base}/status`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching status:', err);
      return { success: false, error: err.message };
    }
  }
}

export async function toggleGlobalPause() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/status.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-pausa' })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/pausa/toggle-global`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await fb.json();
  } catch (err) {
    console.error('Error toggling global pause:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchMesas() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/mesas.php`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/mesas`);
    return await fb.json();
  } catch (err) {
    try {
      const fb = await fetch(`${base}/mesas`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching mesas:', err);
      return { success: false, mesas: [] };
    }
  }
}

export async function fetchNotas(filtros = {}) {
  const base = getApiBase();
  try {
    const params = new URLSearchParams(filtros).toString();
    const res = await fetch(`${base}/notas.php?${params}`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/notas?${params}`);
    return await fb.json();
  } catch (err) {
    try {
      const params = new URLSearchParams(filtros).toString();
      const fb = await fetch(`${base}/notas?${params}`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching notas:', err);
      return { success: false, notas: [] };
    }
  }
}

export async function fetchDetalleNota(notaId) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?id=${notaId}`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/notas/${notaId}`);
    return await fb.json();
  } catch (err) {
    try {
      const fb = await fetch(`${base}/notas/${notaId}`);
      return await fb.json();
    } catch (e) {
      console.error(`Error fetching detalle nota ${notaId}:`, err);
      return { success: false, error: err.message };
    }
  }
}

export async function fetchOperarios() {
  // 1. Intentar directo a Node Express (puerto 3015 o proxy /api)
  try {
    const resNode = await fetch('http://localhost:3015/api/operarios');
    if (resNode.ok) {
      const data = await resNode.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  try {
    const resProxy = await fetch('/api/operarios');
    if (resProxy.ok) {
      const data = await resProxy.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  // 2. Fallback
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/operarios`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/operarios.php`);
    return await fb.json();
  } catch (err) {
    console.error('Error fetching operarios:', err);
    return { success: false, operarios: [] };
  }
}

export async function asignarSeparadorANota(notaId, separadorId) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=asignar-separador&id=${notaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ separadorId })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/notas/${notaId}/asignar-separador`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ separadorId })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error asignando separador:', err);
    return { success: false, error: err.message };
  }
}

export async function asignarMesaANota(notaId, mesaCodigo) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=asignar-mesa&id=${notaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesaCodigo })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/notas/${notaId}/asignar-mesa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesaCodigo })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error asignando mesa:', err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// SECTOR 1: EXTRACCIÓN Y APROBACIÓN COMERCIAL & CRÉDITO
// -------------------------------------------------------------

export async function fetchPedidosPendientesFirebird(limit = 60) {
  // 1. Intentar directo a Node backend (puerto 3015)
  try {
    const fb = await fetch(`http://localhost:3015/api/firebird/pendientes?limit=${limit}`);
    if (fb.ok) {
      const data = await fb.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  // 2. Intentar vía Apache / PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=pendientes-firebird&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  try {
    const res2 = await fetch(`${base}/firebird/pendientes?limit=${limit}`);
    if (res2.ok) return await res2.json();
  } catch (err) {
    console.error('Error fetching pedidos pendientes Firebird:', err);
  }

  return { success: false, pedidos: [], total: 0 };
}

export async function fetchDetallePedidoFirebird(numPedido) {
  // 1. Intentar directo a Node backend (puerto 3015)
  try {
    const fb = await fetch(`http://localhost:3015/api/firebird/pedidos/${numPedido}`);
    if (fb.ok) {
      const data = await fb.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  // 2. Intentar vía Apache / PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=detalle-firebird&num_pedido=${numPedido}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  try {
    const res2 = await fetch(`${base}/firebird/pedidos/${numPedido}`);
    if (res2.ok) return await res2.json();
  } catch (err) {
    console.error(`Error fetching detalle pedido #${numPedido}:`, err);
  }

  return { success: false, error: 'No se pudo obtener el detalle de Firebird' };
}

export async function aprobarPedidoCredito({ numPedido, supervisorId, supervisorNombre, comentario, itemsModificados }) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=aprobar-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numPedido, supervisorId, supervisorNombre, comentario, itemsModificados })
    });
    if (res.ok) {
      const d = await res.json();
      if (d && d.success && (d.estado === 'CONFIRMADO' || d.notaId)) {
        return d;
      }
    }
  } catch (err) {
    console.warn('Fallo en notas.php?action=aprobar-credito, probando fallback Node API:', err);
  }

  // Fallback directo a Node API (puerto 3015)
  try {
    const fb = await fetch(`http://localhost:3015/api/pedidos/aprobar-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numPedido, supervisorId, supervisorNombre, comentario, itemsModificados })
    });
    return await fb.json();
  } catch (e) {
    console.error('Error aprobando pedido crédito:', e);
    return { success: false, error: e.message };
  }
}

export async function retenerPedidoCredito({ numPedido, supervisorId, supervisorNombre, motivo }) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=retener-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numPedido, supervisorId, supervisorNombre, motivo })
    });
    if (res.ok) {
      const d = await res.json();
      if (d && d.success && (d.estado === 'EN_ESPERA' || d.notaId)) {
        return d;
      }
    }
  } catch (err) {
    console.warn('Fallo en notas.php?action=retener-credito, probando fallback Node API:', err);
  }

  try {
    const fb = await fetch(`http://localhost:3015/api/pedidos/retener-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numPedido, supervisorId, supervisorNombre, motivo })
    });
    return await fb.json();
  } catch (e) {
    console.error('Error reteniendo pedido crédito:', e);
    return { success: false, error: e.message };
  }
}

export async function rechazarPedidoCredito({ numPedido, supervisorId, supervisorNombre, motivo }) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=rechazar-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numPedido, supervisorId, supervisorNombre, motivo })
    });
    if (res.ok) {
      const d = await res.json();
      if (d && d.success && (d.estado === 'RECHAZADO' || d.notaId)) {
        return d;
      }
    }
  } catch (err) {
    console.warn('Fallo en notas.php?action=rechazar-credito, probando fallback Node API:', err);
  }

  try {
    const fb = await fetch(`http://localhost:3015/api/pedidos/rechazar-credito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numPedido, supervisorId, supervisorNombre, motivo })
    });
    return await fb.json();
  } catch (e) {
    console.error('Error rechazando pedido crédito:', e);
    return { success: false, error: e.message };
  }
}

// -------------------------------------------------------------
// SECTOR 2: PEDIDOS CONFIRMADOS LISTOS PARA ASIGNAR EN DEPÓSITO
// -------------------------------------------------------------

export async function fetchPedidosEnEspera() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=en-espera`);
    if (res.ok) {
      const d = await res.json();
      if (d && Array.isArray(d.pedidos)) return d;
    }
  } catch (_) {}

  try {
    const fb = await fetch(`http://localhost:3015/api/pedidos/en-espera`);
    return await fb.json();
  } catch (e) {
    return { success: false, pedidos: [], total: 0 };
  }
}

export async function fetchPedidosConfirmados() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=confirmados`);
    if (res.ok) {
      const d = await res.json();
      if (d && Array.isArray(d.pedidos)) {
        return d;
      }
    }
  } catch (err) {
    console.warn('Fallo en notas.php?action=confirmados, probando fallback Node API:', err);
  }

  try {
    const fb = await fetch(`http://localhost:3015/api/pedidos/confirmados`);
    return await fb.json();
  } catch (e) {
    console.error('Error fetching pedidos confirmados:', e);
    return { success: false, pedidos: [], total: 0 };
  }
}

export async function fetchEstadoGeneralSupervisor() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/supervisor.php?action=estado-general`);
    if (res.ok) {
      const d = await res.json();
      if (d && Array.isArray(d.separadores)) {
        return d;
      }
    }
  } catch (err) {
    console.warn('Fallo en supervisor.php?action=estado-general, probando fallback Node API:', err);
  }

  try {
    const fb = await fetch(`http://localhost:3015/api/supervisor/estado-general`);
    return await fb.json();
  } catch (e) {
    console.error('Error fetching estado general supervisor:', e);
    return { success: false, error: e.message };
  }
}

export async function confirmarMesaSupervisor(notaId, supervisorId, mesaCodigo) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/supervisor.php?action=confirmar-mesa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, supervisorId, mesaCodigo })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/supervisor/confirmar-mesa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, supervisorId, mesaCodigo })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error confirmando mesa por supervisor:', err);
    return { success: false, error: err.message };
  }
}

export async function loginSupervisor(usuario, pin) {
  // 1. Intentar directo a Node Express
  try {
    const resNode = await fetch('http://localhost:3015/api/supervisor/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, codigo: usuario, pin })
    });
    if (resNode.ok) return await resNode.json();
  } catch (_) {}

  try {
    const resProxy = await fetch('/api/supervisor/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, codigo: usuario, pin })
    });
    if (resProxy.ok) return await resProxy.json();
  } catch (_) {}

  // 2. Fallback a Apache PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/supervisor.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, codigo: usuario, pin })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/supervisor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, codigo: usuario, pin })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error en login de supervisor:', err);
    return { success: false, error: err.message };
  }
}

export async function toggleHoraExtra({ separadorId, notaId, permiteHoraExtra }) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/supervisor.php?action=hora-extra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ separadorId, notaId, permiteHoraExtra })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/supervisor/hora-extra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ separadorId, notaId, permiteHoraExtra })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error toggling hora extra:', err);
    return { success: false, error: err.message };
  }
}

export async function toggleMostrador(notaId) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/notas.php?action=toggle-mostrador&id=${notaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/notas/${notaId}/toggle-mostrador`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await fb.json();
  } catch (err) {
    console.error('Error toggling mostrador:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchReporteSeparadores(mes = '') {
  const base = getApiBase();
  const q = mes ? `?mes=${encodeURIComponent(mes)}` : '';
  try {
    const res = await fetch(`${base}/reportes.php?tipo=separadores${mes ? `&mes=${encodeURIComponent(mes)}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.reporte)) {
        return {
          success: true,
          reporte: data.reporte.map(d => ({
            operario_id: d.separador_id || d.operario_id || 0,
            operario_codigo: d.separador_codigo || d.operario_codigo || `SEP${String(d.separador_id || '').padStart(3, '0')}`,
            operario_nombre: d.separador_nombre || d.operario_nombre || 'Separador',
            total_notas: Number(d.total_pedidos || d.total_notas || 0),
            total_piezas: Number(d.total_piezas || 0),
            total_bips: Number(d.total_bips || 0),
            tiempo_total_fmt: d.tiempo_total_fmt || '00:00:00',
            tiempo_promedio_nota_fmt: d.promedio_pedido_fmt || d.tiempo_promedio_nota_fmt || '00:00:00',
            segundos_por_bip: Number(d.segundos_por_pieza || d.segundos_por_bip || 0)
          }))
        };
      }
    }
  } catch (err) {
    console.warn('Fallo en PHP reportes.php, probando Node API:', err.message);
  }

  try {
    const fb = await fetch(`http://localhost:3015/api/reportes/separadores${q}`);
    if (fb.ok) return await fb.json();
  } catch (e) {
    console.error('Error fetching reporte separadores:', e);
  }
  return { success: false, reporte: [] };
}

export async function fetchReporteGuardadores(mes = '') {
  const base = getApiBase();
  const q = mes ? `?mes=${encodeURIComponent(mes)}` : '';
  try {
    const res = await fetch(`${base}/reportes.php?tipo=guardadores${mes ? `&mes=${encodeURIComponent(mes)}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.reporte)) {
        return {
          success: true,
          reporte: data.reporte.map(d => ({
            operario_id: d.guardador_id || d.operario_id || 0,
            operario_codigo: d.guardador_codigo || d.operario_codigo || `GRD${String(d.guardador_id || '').padStart(3, '0')}`,
            operario_nombre: d.guardador_nombre || d.operario_nombre || 'Guardador',
            total_notas: Number(d.total_pedidos_revisados || d.total_notas || 0),
            total_piezas: Number(d.total_piezas || 0),
            tiempo_total_mesa_fmt: d.tiempo_total_fmt || '00:00:00',
            tiempo_promedio_mesa_fmt: d.promedio_pedido_fmt || '00:00:00',
            tiempo_total_ciclo_fmt: d.tiempo_total_fmt || '00:00:00'
          }))
        };
      }
    }
  } catch (err) {
    console.warn('Fallo en PHP reportes.php guardadores, probando Node API:', err.message);
  }

  try {
    const fb = await fetch(`http://localhost:3015/api/reportes/guardadores${q}`);
    if (fb.ok) return await fb.json();
  } catch (e) {
    console.error('Error fetching reporte guardadores:', e);
  }
  return { success: false, reporte: [] };
}

export function getExportarCsvUrl(tipo = 'separadores', mes = '') {
  const base = getApiBase();
  const mesParam = mes ? `&mes=${encodeURIComponent(mes)}` : '';
  return `${base}/reportes.php?action=csv&tipo=${encodeURIComponent(tipo)}${mesParam}`;
}

export async function fetchDiscrepancias(filtros = {}) {
  const base = getApiBase();
  try {
    const params = new URLSearchParams(filtros).toString();
    const res = await fetch(`${base}/discrepancias.php?${params}`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/discrepancias?${params}`);
    return await fb.json();
  } catch (err) {
    try {
      const params = new URLSearchParams(filtros).toString();
      const fb = await fetch(`${base}/discrepancias?${params}`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching discrepancias:', err);
      return { success: false, discrepancias: [] };
    }
  }
}

export async function fetchDiscrepanciasRecurrentes() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/discrepancias.php?action=recurrentes`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/discrepancias/recurrentes-semana`);
    return await fb.json();
  } catch (err) {
    try {
      const fb = await fetch(`${base}/discrepancias/recurrentes-semana`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching discrepancias recurrentes:', err);
      return { success: false, recurrentes: [] };
    }
  }
}

export async function resolverDiscrepancia(id, { supervisorId, accion, comentario, nuevaUbicacion }) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/discrepancias.php?action=resolver&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supervisorId, accion, comentario, nuevaUbicacion })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/discrepancias/${id}/resolver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supervisorId, accion, comentario, nuevaUbicacion })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error resolviendo discrepancia:', err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// GESTIÓN DE PERSONAL, USUARIOS & MATRIZ DE PERMISOS (DEPSYS)
// -------------------------------------------------------------

export async function fetchTodosOperarios() {
  // 1. Intentar directo a Node Express (puerto 3015 o proxy /api)
  try {
    const resNode = await fetch('http://localhost:3015/api/operarios?todos=1');
    if (resNode.ok) {
      const data = await resNode.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  try {
    const resProxy = await fetch('/api/operarios?todos=1');
    if (resProxy.ok) {
      const data = await resProxy.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  // 2. Fallback a Apache PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/operarios.php?todos=1`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/operarios?todos=1`);
    return await fb.json();
  } catch (err) {
    console.error('Error fetching todos los operarios:', err);
    return { success: false, operarios: [], stats: {} };
  }
}

export async function fetchSuggestedCodigo(rol) {
  // 1. Intentar directo a Node
  try {
    const resNode = await fetch(`http://localhost:3015/api/operarios?sugerir_codigo=${encodeURIComponent(rol)}`);
    if (resNode.ok) {
      const data = await resNode.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  try {
    const resProxy = await fetch(`/api/operarios?sugerir_codigo=${encodeURIComponent(rol)}`);
    if (resProxy.ok) {
      const data = await resProxy.json();
      if (data && data.success) return data;
    }
  } catch (_) {}

  // 2. Fallback a PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/operarios.php?sugerir_codigo=${encodeURIComponent(rol)}`);
    if (res.ok) return await res.json();
    return { success: false, codigo_sugerido: '' };
  } catch (err) {
    console.error('Error sugerir codigo:', err);
    return { success: false, codigo_sugerido: '' };
  }
}

export async function guardarOperario(datos) {
  // 1. Intentar directo a Node
  try {
    const resNode = await fetch('http://localhost:3015/api/operarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    if (resNode.ok) return await resNode.json();
  } catch (_) {}

  try {
    const resProxy = await fetch('/api/operarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    if (resProxy.ok) return await resProxy.json();
  } catch (_) {}

  // 2. Fallback a PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/operarios.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return await res.json();
  } catch (err) {
    console.error('Error guardando operario:', err);
    return { success: false, error: err.message };
  }
}

export async function toggleActivoOperario(codigo) {
  // 1. Intentar directo a Node
  try {
    const resNode = await fetch('http://localhost:3015/api/operarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_activo', codigo })
    });
    if (resNode.ok) return await resNode.json();
  } catch (_) {}

  try {
    const resProxy = await fetch('/api/operarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_activo', codigo })
    });
    if (resProxy.ok) return await resProxy.json();
  } catch (_) {}

  // 2. Fallback a PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/operarios.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_activo', codigo })
    });
    return await res.json();
  } catch (err) {
    console.error('Error toggle activo operario:', err);
    return { success: false, error: err.message };
  }
}

export async function resetPinOperario(codigo, pin) {
  // 1. Intentar directo a Node
  try {
    const resNode = await fetch('http://localhost:3015/api/operarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_pin', codigo, pin })
    });
    if (resNode.ok) return await resNode.json();
  } catch (_) {}

  try {
    const resProxy = await fetch('/api/operarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_pin', codigo, pin })
    });
    if (resProxy.ok) return await resProxy.json();
  } catch (_) {}

  // 2. Fallback a PHP
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/operarios.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_pin', codigo, pin })
    });
    return await res.json();
  } catch (err) {
    console.error('Error reseteando PIN operario:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchPermisosMatrix() {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/permisos.php`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/permisos`);
    return await fb.json();
  } catch (err) {
    console.error('Error fetching permisos matrix:', err);
    return { success: false, matrix: null };
  }
}

export async function guardarPermisosMatrix(matrix) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/permisos.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrix })
    });
    return await res.json();
  } catch (err) {
    console.error('Error guardando permisos matrix:', err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// OPERACIÓN DE MESAS Y BANCADAS FÍSICAS (TERMINAL DE REVISIÓN)
// -------------------------------------------------------------

export async function fetchColaMesa(mesaCodigo) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/mesas.php?codigo=${mesaCodigo}`);
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/mesas/${mesaCodigo}/cola`);
    return await fb.json();
  } catch (err) {
    try {
      const fb = await fetch(`${base}/mesas/${mesaCodigo}/cola`);
      return await fb.json();
    } catch (e) {
      console.error(`Error fetching cola mesa ${mesaCodigo}:`, err);
      return { success: false, error: err.message, notas: [] };
    }
  }
}

export async function iniciarRevisionMesa(notaId, guardadorId) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/mesas.php?action=iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, guardadorId })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/mesa/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, guardadorId })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error iniciando revision mesa:', err);
    return { success: false, error: err.message };
  }
}

export async function finalizarRevisionMesa(notaId, guardadorId) {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/mesas.php?action=finalizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, guardadorId })
    });
    if (res.ok) return await res.json();
    const fb = await fetch(`${base}/mesa/finalizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, guardadorId })
    });
    return await fb.json();
  } catch (err) {
    console.error('Error finalizando revision mesa:', err);
    return { success: false, error: err.message };
  }
}




