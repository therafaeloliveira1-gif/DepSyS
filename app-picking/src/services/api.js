import { Capacitor } from '@capacitor/core';
export { formatDatePY, formatTimePY } from '../utils/formatters';

export function getServerHost() {
  const saved = localStorage.getItem('depsys_server_host') || localStorage.getItem('depsystem_server_host');
  if (saved) return saved;
  // Detección automática de servidor Apache local en el depósito
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.test') || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('26.')) {
      return `http://${h}/api/DepSyS_Api`;
    }
  }
  // Endpoint en la nube Apache de respaldo
  return 'https://www.motosmendes.com/api/DepSyS_Api';
}

export function setServerHost(host) {
  if (!host) return;
  let cleanHost = host.trim();
  // Si no especifica protocolo ni puerto y parece IP local
  if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
    if (cleanHost.includes(':') || cleanHost.startsWith('192.168.') || cleanHost.startsWith('10.') || cleanHost.startsWith('localhost')) {
      if (!cleanHost.includes(':')) cleanHost += ':3015';
      cleanHost = `http://${cleanHost}/api`;
    } else {
      cleanHost = `https://${cleanHost}`;
    }
  }
  localStorage.setItem('depsys_server_host', cleanHost);
  localStorage.setItem('depsystem_server_host', cleanHost);
}

export function getApiBase() {
  const host = getServerHost();
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host.replace(/\/+$/, '');
  }
  if (Capacitor.isNativePlatform()) {
    return `http://${host}/api`;
  }
  return '/api';
}

export async function fetchStatus() {
  try {
    const res = await fetch(`${getApiBase()}/status.php`);
    if (!res.ok) {
      // Fallback a ruta limpia /status
      const fb = await fetch(`${getApiBase()}/status`);
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    try {
      const fb = await fetch(`${getApiBase()}/status`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching status:', err);
      return { success: false, error: err.message };
    }
  }
}

export async function fetchOperarios(rol = 'SEPARADOR') {
  try {
    const res = await fetch(`${getApiBase()}/operarios.php?rol=${rol}`);
    if (!res.ok) {
      const fb = await fetch(`${getApiBase()}/operarios?rol=${rol}`);
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    try {
      const fb = await fetch(`${getApiBase()}/operarios?rol=${rol}`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching operarios:', err);
      return { success: false, operarios: [] };
    }
  }
}

export async function fetchMesas() {
  try {
    const res = await fetch(`${getApiBase()}/mesas.php`);
    if (!res.ok) {
      const fb = await fetch(`${getApiBase()}/mesas`);
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    try {
      const fb = await fetch(`${getApiBase()}/mesas`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching mesas:', err);
      return { success: false, mesas: [] };
    }
  }
}

export async function fetchPedidoReal(numPedido) {
  try {
    const cleanNum = String(numPedido).trim();
    const res = await fetch(`${getApiBase()}/notas.php?num_pedido=${cleanNum}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.pedido && Array.isArray(data.items) && data.items.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn(`Aviso consultando notas.php?num_pedido=${numPedido}:`, err);
  }

  // Fallback a endpoint de pedidos en Node API
  try {
    const cleanNum = String(numPedido).trim();
    const fb = await fetch(`http://localhost:3015/api/pedidos/${cleanNum}`);
    return await fb.json();
  } catch (e) {
    console.error(`Error fetching pedido ${numPedido}:`, e);
    return { success: false, error: e.message };
  }
}

export async function fetchNotas(filtros = {}) {
  try {
    const params = new URLSearchParams(filtros).toString();
    const res = await fetch(`${getApiBase()}/notas.php?${params}`);
    if (!res.ok) {
      const fb = await fetch(`${getApiBase()}/notas?${params}`);
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    try {
      const params = new URLSearchParams(filtros).toString();
      const fb = await fetch(`${getApiBase()}/notas?${params}`);
      return await fb.json();
    } catch (e) {
      console.error('Error fetching notas:', err);
      return { success: false, notas: [] };
    }
  }
}

export async function iniciarPicking(notaId, operarioId) {
  try {
    const res = await fetch(`${getApiBase()}/picking.php?action=iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, operarioId })
    });
    if (!res.ok) {
      const fb = await fetch(`${getApiBase()}/picking/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId })
      });
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    console.error('Error iniciando picking:', err);
    return { success: false, error: err.message };
  }
}

export async function registrarBip(notaId, operarioId, barcode) {
  try {
    const res = await fetch(`${getApiBase()}/picking.php?action=bip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, operarioId, barcode })
    });
    if (!res.ok) {
      const fb = await fetch(`${getApiBase()}/picking/bip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId, barcode })
      });
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    console.error('Error registrando bip:', err);
    return { success: false, error: err.message };
  }
}

export async function finalizarPicking(notaId, operarioId, mesaCodigo) {
  try {
    const res = await fetch(`${getApiBase()}/picking.php?action=finalizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, operarioId, mesaCodigo, mesaSugeridaCodigo: mesaCodigo })
    });
    if (!res.ok) {
      const fb = await fetch(`${getApiBase()}/picking/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId, mesaCodigo })
      });
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    console.error('Error finalizando picking:', err);
    return { success: false, error: err.message };
  }
}

export async function reportarFaltanteApi(notaId, itemId, operarioId, motivo = '') {
  try {
    const res = await fetch(`${getApiBase()}/picking.php?action=reportar-faltante`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, itemId, operarioId, motivo })
    });
    if (!res.ok) {
      const fb = await fetch(`${getApiBase()}/picking/reportar-faltante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, itemId, operarioId, motivo })
      });
      return await fb.json();
    }
    return await res.json();
  } catch (err) {
    console.error('Error reportando faltante:', err);
    return { success: false, error: err.message };
  }
}

export async function loginSeparador(usuario, pin) {
  try {
    const res = await fetch(`${getApiBase()}/operarios.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', usuario, pin, rol: 'SEPARADOR' })
    });
    return await res.json();
  } catch (err) {
    console.error('Error en login de separador:', err);
    return { success: false, error: err.message };
  }
}
