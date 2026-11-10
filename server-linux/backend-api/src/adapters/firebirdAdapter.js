const { execFile } = require('child_process');
const path = require('path');

const BIN_PATH = path.join(__dirname, '..', '..', 'bin', 'get_firebird_pedido.exe');
const SYNC_PY_PATH = path.join(__dirname, '..', '..', 'bin', 'firebird_sync.py');

/**
 * Consulta un pedido real en el ERP Firebird de Motos Mendes (c:\System\SGLoja\Dados\FB_DADOS.FDB).
 * @param {string|number} numPedido - Número de pedido (ej: 38002)
 * @returns {Promise<Object>} Datos del pedido y sus ítems
 */
function obtenerPedidoFirebird(numPedido) {
  return new Promise((resolve) => {
    if (!numPedido) {
      return resolve({ success: false, error: 'Número de pedido no especificado' });
    }

    const cleanNum = String(numPedido).trim();

    execFile('python', [SYNC_PY_PATH, 'PEDIDO', cleanNum], {
      windowsHide: true,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB
    }, (error, stdout, stderr) => {
      if (error) {
        // Fallback al exe antiguo si python falla
        execFile(BIN_PATH, [cleanNum], {
          windowsHide: true,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        }, (errExe, stdoutExe) => {
          if (errExe) {
            return resolve({ success: false, error: `Error extractor Firebird: ${errExe.message}` });
          }
          try {
            resolve(JSON.parse(stdoutExe.trim()));
          } catch (e) {
            resolve({ success: false, error: 'Respuesta inválida de Firebird' });
          }
        });
        return;
      }

      try {
        const data = JSON.parse(stdout.trim());
        resolve(data);
      } catch (parseErr) {
        resolve({
          success: false,
          error: `Respuesta inválida de Firebird: ${stdout.substring(0, 300)}`
        });
      }
    });
  });
}

/**
 * Consulta la lista de pedidos en espera (CODSITUACAO = 1) en Firebird.
 * @param {number} limit - Límite de pedidos a listar
 */
function listarPedidosPendientesFirebird(limit = 50) {
  return new Promise((resolve) => {
    execFile('python', [SYNC_PY_PATH, 'PENDIENTES', String(limit)], {
      windowsHide: true,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        return resolve({ success: false, error: `Error listando pendientes Firebird: ${error.message}` });
      }

      try {
        const data = JSON.parse(stdout.trim());
        resolve(data);
      } catch (parseErr) {
        resolve({ success: false, error: 'Respuesta inválida al listar pedidos pendientes' });
      }
    });
  });
}

/**
 * Busca clientes en el ERP Firebird (V_CAD_CLIENTE).
 * @param {string} termino - Término de búsqueda (código, nombre o razón social)
 */
function buscarClientesFirebird(termino) {
  return new Promise((resolve) => {
    if (!termino) {
      return resolve({ success: true, data: [] });
    }

    execFile(BIN_PATH, ['SEARCH', String(termino).trim()], {
      windowsHide: true,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        return resolve({ success: false, error: error.message });
      }

      try {
        const data = JSON.parse(stdout.trim());
        resolve(data);
      } catch (parseErr) {
        resolve({ success: false, error: 'Error parseando lista de clientes' });
      }
    });
  });
}

module.exports = {
  obtenerPedidoFirebird,
  listarPedidosPendientesFirebird,
  buscarClientesFirebird
};
