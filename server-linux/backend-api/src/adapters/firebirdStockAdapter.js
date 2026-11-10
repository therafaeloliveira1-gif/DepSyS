const Firebird = require('node-firebird');

/**
 * ============================================================================
 * ADAPTADOR FIREBIRD ERP (MOTOS MENDES) - CONSULTA DE STOCK TEÓRICO
 * ============================================================================
 * DIRECTIVA SAGRADA DE SEGURIDAD:
 * ESTE ARCHIVO ES ESTRICTAMENTE 100% DE SOLO LECTURA (SELECT).
 * NUNCA SE EJECUTA NINGÚN INSERT, UPDATE, DELETE, POST NI MUTACIÓN EN FIREBIRD.
 * TODA MUTACIÓN Y REGISTRO SE HACE EXCLUSIVAMENTE EN LA BASE DE DATOS MYSQL (mendes_db).
 * ============================================================================
 */

const fbConfig = {
  host: process.env.FIREBIRD_HOST || '127.0.0.1',
  port: parseInt(process.env.FIREBIRD_PORT, 10) || 3050,
  database: process.env.FIREBIRD_DATABASE || 'c:/WorkSpace/motos-mendes-data/FB_DATA/FB_DADOS.FDB',
  user: process.env.FIREBIRD_USER || 'SYSDBA',
  password: process.env.FIREBIRD_PASSWORD || 'masterkey',
  lowercase_keys: true,
  role: null,
  pageSize: 4096
};

/**
 * Consulta el stock físico teórico y ubicación de un producto en Firebird.
 * ÚNICA OPERACIÓN: SELECT pura.
 * 
 * @param {string|number} codProd - Código de producto (CODPROD) o código de barra (CODBAR)
 * @returns {Promise<{
 *   success: boolean,
 *   existe: boolean,
 *   codprod?: string,
 *   descricao?: string,
 *   codbar?: string,
 *   stock_fisico?: number,
 *   stock_reserva?: number,
 *   stock_empenhado?: number,
 *   deposito1?: number,
 *   ubicacion_estante?: string,
 *   error?: string
 * }>}
 */
function consultarStockTeoricoFirebird(codProd) {
  return new Promise((resolve) => {
    if (!codProd) {
      return resolve({
        success: false,
        existe: false,
        error: 'Código de producto o código de barra no especificado'
      });
    }

    const cleanCode = String(codProd).trim();

    Firebird.attach(fbConfig, (err, db) => {
      if (err) {
        console.error('❌ Error conectando a Firebird (Solo Lectura):', err.message);
        return resolve({
          success: false,
          existe: false,
          error: `Error de conexión Firebird: ${err.message}`
        });
      }

      // SENTENCIA ESTRICTAMENTE SELECT (Solo Lectura)
      const sql = `
        SELECT FIRST 1 
          p.CODPROD, 
          p.DESCRICAO, 
          p.CODBAR,
          COALESCE(q.QTFISICA, 0) as QTFISICA,
          COALESCE(q.QTRESERVA, 0) as QTRESERVA,
          COALESCE(q.QTEMPENHADA, 0) as QTEMPENHADA,
          COALESCE(q.QTDEPOSITO1, 0) as QTDEPOSITO1,
          l.DESCRICAO as UBICACION_ESTANTE
        FROM PRD_PRODUTO p
        LEFT JOIN PRD_QTDE q ON q.CODPROD = p.CODPROD
        LEFT JOIN PRD_PRDLOCAL l ON l.CODPROD = p.CODPROD
        WHERE p.CODPROD = ? OR p.CODBAR = ?
      `;

      db.query(sql, [cleanCode, cleanCode], (qErr, rows) => {
        // Asegurar siempre el detach para liberar el pool/conexión
        try {
          db.detach();
        } catch (detachErr) {
          // Ignorar error de detach si ya cerró
        }

        if (qErr) {
          console.error('❌ Error ejecutando SELECT en Firebird:', qErr.message);
          return resolve({
            success: false,
            existe: false,
            error: `Error ejecutando consulta en Firebird: ${qErr.message}`
          });
        }

        if (!rows || rows.length === 0) {
          return resolve({
            success: true,
            existe: false,
            codprod: cleanCode,
            stock_fisico: 0,
            error: 'Producto no encontrado en catálogo ERP'
          });
        }

        const row = rows[0];
        resolve({
          success: true,
          existe: true,
          codprod: String(row.codprod || cleanCode).trim(),
          descricao: (row.descricao || '').trim(),
          codbar: (row.codbar || '').trim(),
          stock_fisico: Number(row.qtfisica) || 0,
          stock_reserva: Number(row.qtreserva) || 0,
          stock_empenhado: Number(row.qtempenhada) || 0,
          deposito1: Number(row.qtdeposito1) || 0,
          ubicacion_estante: (row.ubicacion_estante || '').trim() || 'SIN ASIGNAR'
        });
      });
    });
  });
}

module.exports = {
  consultarStockTeoricoFirebird
};
