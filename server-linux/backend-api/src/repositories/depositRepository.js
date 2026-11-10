const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { consultarStockTeoricoFirebird } = require('../adapters/firebirdStockAdapter');

/**
 * Inicializa las tablas en mendes_db e inserta datos base de configuración, mesas y operarios.
 */
async function initDatabase() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // Configuración base
    const configs = [
      ['HORA_INICIO_TURNO', '07:15', 'Inicio oficial de cronómetro de trabajo'],
      ['HORA_FIN_TURNO', '17:00', 'Fin oficial de jornada'],
      ['PAUSA_CAFE_MINUTOS', '15', 'Duración del café (07:00 a 07:15)'],
      ['ALMUERZO_INICIO', '11:30', 'Inicio de almuerzo automático'],
      ['ALMUERZO_FIN', '13:00', 'Fin de almuerzo automático'],
      ['CAFE_TARDE_INICIO', '15:30', 'Inicio café tarde automático'],
      ['CAFE_TARDE_FIN', '15:45', 'Fin café tarde automático'],
      ['PAUSA_GLOBAL_ACTIVA', '0', '1 si el depósito está en pausa global'],
      ['UMBRAL_DEMORA_MINUTOS', '35', 'Minutos para alerta roja de pedido demorado'],
      ['UMBRAL_ALERTA_CONFIRMACION_MIN', '3', 'Minutos para alerta de supervisor cuello de botella']
    ];
    for (const [k, v, d] of configs) {
      await conn.query('INSERT IGNORE INTO tbl_configuracion (clave, valor, descripcion) VALUES (?, ?, ?)', [k, v, d]);
    }

    // Mesas oficiales
    const mesas = [
      ['301', 'Mesa 301 - Revisión y Embalaje', 'Mesa principal sector repuestos rápidos'],
      ['302', 'Mesa 302 - Revisión y Embalaje', 'Mesa secundaria sector repuestos rápidos'],
      ['303', 'Mesa 303 - Carga Pesada', 'Mesa especializada en cilindros, cubiertas y piezas pesadas'],
      ['304', 'Mesa 304 - Envíos Exprés', 'Mesa de despacho rápido para encomiendas']
    ];
    for (const [cod, nom, desc] of mesas) {
      await conn.query('INSERT IGNORE INTO tbl_mesas (codigo, nombre, descripcion) VALUES (?, ?, ?)', [cod, nom, desc]);
    }

    // Sincronizar operarios oficiales desde Firebird si la tabla está vacía
    const [[opCount]] = await conn.query('SELECT COUNT(*) as total FROM tbl_operarios WHERE activo = 1');
    if (opCount.total === 0) {
      setTimeout(() => {
        sincronizarOperariosDesdeFirebird().catch(e => console.warn('Error en auto-sincronización de operarios:', e.message));
      }, 500);
    }

    return { success: true, message: 'Base de datos mendes_db inicializada correctamente' };
  } finally {
    conn.release();
  }
}

/**
 * Registra una transición de estado en tbl_estados_historial.
 */
async function registrarTransicionEstado(notaId, estadoAnterior, estadoNuevo, operarioId = null, operarioNombre = null, detalles = null) {
  try {
    await pool.query(`
      INSERT INTO tbl_estados_historial (nota_id, estado_anterior, estado_nuevo, operario_id, operario_nombre, detalles)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [notaId, estadoAnterior, estadoNuevo, operarioId, operarioNombre, detalles ? JSON.stringify(detalles) : null]);
  } catch (err) {
    console.error('Error registrando transición de estado:', err.message);
  }
}

/**
 * Sincroniza los operarios reales de depósito desde Firebird (ADM_USUARIO).
 * DIRECTIVA SAGRADA: Consulta Firebird con puro SELECT (Solo Lectura).
 * Registra o actualiza en MySQL mendes_db (tbl_operarios).
 */
async function sincronizarOperariosDesdeFirebird() {
  const Firebird = require('node-firebird');
  const fbConfig = {
    host: process.env.FIREBIRD_HOST || '127.0.0.1',
    port: parseInt(process.env.FIREBIRD_PORT, 10) || 3050,
    database: process.env.FIREBIRD_DATABASE || 'c:/WorkSpace/motos-mendes-data/FB_DATA/FB_DADOS.FDB',
    user: process.env.FIREBIRD_USER || 'SYSDBA',
    password: process.env.FIREBIRD_PASSWORD || 'masterkey',
    lowercase_keys: true
  };

  return new Promise((resolve) => {
    Firebird.attach(fbConfig, (err, db) => {
      if (err) {
        console.error('Error conectando a Firebird para sincronizar operarios:', err.message);
        return resolve({ success: false, error: err.message });
      }

      const sql = `
        SELECT CODUSU, NOME, LOGIN, DEPTO, TIPO, INATIVO
        FROM ADM_USUARIO
        WHERE DEPTO LIKE '%SEPARAD%' 
           OR DEPTO LIKE '%GUARDAD%' 
           OR DEPTO LIKE '%DEPOSIT%' 
           OR CODUSU IN (6, 8, 11)
        ORDER BY DEPTO, CODUSU
      `;

      db.query(sql, [], async (qErr, rows) => {
        try { db.detach(); } catch (e) {}

        if (qErr) {
          console.error('Error consultando ADM_USUARIO en Firebird:', qErr.message);
          return resolve({ success: false, error: qErr.message });
        }

        const conn = await pool.getConnection();
        try {
          let count = 0;
          for (const u of rows) {
            const depto = (u.depto || '').toUpperCase();
            let rol = 'SEPARADOR';
            let prefijo = 'SEP';

            if (depto.includes('GUARDAD')) {
              rol = 'GUARDADOR';
              prefijo = 'GRD';
            } else if (depto.includes('DEPOSIT') || [6, 8, 11].includes(u.codusu)) {
              rol = 'SUPERVISOR';
              prefijo = 'SUP';
            }

            const codigo = `${prefijo}${String(u.codusu).padStart(3, '0')}`;
            const nombre = (u.nome || u.login || `Usuario ${u.codusu}`).trim();
            const activo = u.inativo === 'S' ? 0 : 1;

            await conn.query(`
              INSERT INTO tbl_operarios (codigo, nombre, pin, rol, activo)
              VALUES (?, ?, '1234', ?, ?)
              ON DUPLICATE KEY UPDATE 
                nombre = VALUES(nombre),
                rol = VALUES(rol),
                activo = VALUES(activo)
            `, [codigo, nombre, rol, activo]);
            count++;
          }

          resolve({ success: true, totalSincronizados: count });
        } catch (dbErr) {
          resolve({ success: false, error: dbErr.message });
        } finally {
          conn.release();
        }
      });
    });
  });
}

// Obtener operarios (activos o todos) con campos completos
async function getOperarios(rol, incluirInactivos = false) {
  let sql = 'SELECT id, codigo, nombre, avatar, pin, rol, mesa_codigo, permisos_custom, activo, created_at FROM tbl_operarios WHERE 1=1';
  const params = [];

  if (rol) {
    if (rol === 'SUPERVISOR') {
      sql += ' AND (rol = "SUPERVISOR" OR rol = "ADMIN")';
    } else {
      sql += ' AND rol = ?';
      params.push(rol);
    }
  }

  if (!incluirInactivos) {
    sql += ' AND activo = 1';
  }

  sql += ' ORDER BY (codigo = "SUP008") DESC, rol ASC, activo DESC, nombre ASC';
  const [rows] = await pool.query(sql, params);
  
  return rows.map(op => {
    let perms = op.permisos_custom;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch (_) { perms = null; }
    }
    return {
      ...op,
      is_master: op.codigo === 'SUP008',
      permisos_custom: perms
    };
  });
}

async function getOperariosStats() {
  const [[stats]] = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(activo = 1), 0) as activos,
      COALESCE(SUM(activo = 0), 0) as inactivos,
      COALESCE(SUM(rol = 'SEPARADOR' AND activo = 1), 0) as separadores_activos,
      COALESCE(SUM(rol = 'GUARDADOR' AND activo = 1), 0) as guardadores_activos,
      COALESCE(SUM((rol = 'SUPERVISOR' OR rol = 'ADMIN') AND activo = 1), 0) as supervisores_activos,
      COALESCE(SUM(rol = 'DISTRIBUIDOR' AND activo = 1), 0) as distribuidores_activos
    FROM tbl_operarios
  `);
  return stats || {
    total: 0,
    activos: 0,
    inactivos: 0,
    separadores_activos: 0,
    guardadores_activos: 0,
    supervisores_activos: 0,
    distribuidores_activos: 0
  };
}

async function getNextSuggestedCode(rol) {
  const prefixMap = {
    'SEPARADOR': 'SEP',
    'GUARDADOR': 'GRD',
    'SUPERVISOR': 'SUP',
    'ADMIN': 'ADM',
    'DISTRIBUIDOR': 'DST'
  };
  const prefix = prefixMap[rol] || 'OP';
  const [rows] = await pool.query('SELECT codigo FROM tbl_operarios WHERE codigo LIKE ? ORDER BY codigo DESC', [`${prefix}%`]);
  let maxNum = 0;
  for (const row of rows) {
    const match = String(row.codigo).match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = maxNum + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function guardarOperario(datos) {
  const { codigo, nombre, rol, pin = '1234', activo = 1, mesa_codigo = null, permisos_custom = null } = datos;
  if (!codigo || !nombre) {
    throw new Error('Código y nombre son obligatorios');
  }
  const permsJson = permisos_custom ? JSON.stringify(permisos_custom) : null;
  const [existente] = await pool.query('SELECT id FROM tbl_operarios WHERE codigo = ?', [codigo]);
  if (existente.length > 0) {
    await pool.query(`
      UPDATE tbl_operarios
      SET nombre = ?, rol = ?, pin = ?, activo = ?, mesa_codigo = ?, permisos_custom = ?
      WHERE codigo = ?
    `, [nombre, rol, pin, activo, mesa_codigo || null, permsJson, codigo]);
    return { success: true, message: `Operario ${codigo} actualizado`, id: existente[0].id };
  } else {
    const [res] = await pool.query(`
      INSERT INTO tbl_operarios (codigo, nombre, rol, pin, activo, mesa_codigo, permisos_custom)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [codigo, nombre, rol, pin, activo, mesa_codigo || null, permsJson]);
    return { success: true, message: `Operario ${codigo} creado`, id: res.insertId };
  }
}

async function toggleActivoOperario(codigo) {
  const [rows] = await pool.query('SELECT id, activo FROM tbl_operarios WHERE codigo = ?', [codigo]);
  if (rows.length === 0) throw new Error('Operario no encontrado');
  const nuevoActivo = rows[0].activo === 1 ? 0 : 1;
  await pool.query('UPDATE tbl_operarios SET activo = ? WHERE codigo = ?', [nuevoActivo, codigo]);
  return { success: true, codigo, activo: nuevoActivo };
}

async function resetPinOperario(codigo, nuevoPin) {
  await pool.query('UPDATE tbl_operarios SET pin = ? WHERE codigo = ?', [nuevoPin, codigo]);
  return { success: true, codigo, message: 'PIN actualizado' };
}

// Obtener mesas
async function getMesas() {
  const [rows] = await pool.query('SELECT * FROM tbl_mesas ORDER BY codigo ASC');
  return rows;
}

// Guardar o registrar nota real de Firebird en el depósito
async function registrarNotaDesdeFirebird(pedidoNormalizado) {
  const numPedido = String(pedidoNormalizado.num_pedido).trim();

  // 1. Verificar si ya existe en mendes_db
  const [existente] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE num_pedido = ?', [numPedido]);
  if (existente.length > 0) {
    const notaId = existente[0].id;
    const [items] = await pool.query('SELECT * FROM tbl_nota_items WHERE nota_id = ? ORDER BY num_item ASC', [notaId]);
    if (items.length > 0) {
      return { nota: existente[0], items, yaExistia: true };
    }

    // Si la cabecera existía pero no tenía ítems en tbl_nota_items, insertarlos ahora
    if (Array.isArray(pedidoNormalizado.items) && pedidoNormalizado.items.length > 0) {
      for (const it of pedidoNormalizado.items) {
        const cant = it.cantidad || it.cantidad_requerida || 1;
        await pool.query(`
          INSERT INTO tbl_nota_items (
            nota_id, num_item, sku, codigo_barra, descripcion, ubicacion,
            cantidad_requerida, cantidad_bipada, precio_unitario, subtotal, estado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'PENDIENTE')
        `, [
          notaId,
          it.num_item,
          it.sku,
          it.codigo_barra,
          it.descripcion,
          it.ubicacion || 'PAS-01',
          cant,
          it.precio_unitario || it.precio_lista || 0,
          it.subtotal || (cant * (it.precio_unitario || it.precio_lista || 0))
        ]);
      }
      const [itemsCreados] = await pool.query('SELECT * FROM tbl_nota_items WHERE nota_id = ? ORDER BY num_item ASC', [notaId]);
      return { nota: existente[0], items: itemsCreados, yaExistia: true };
    }

    return { nota: existente[0], items: [], yaExistia: true };
  }

  // 2. Insertar nueva nota
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [resNota] = await conn.query(`
      INSERT INTO tbl_notas_deposito (
        num_pedido, cliente_codigo, cliente_nombre, cliente_ciudad, cliente_telefono,
        vendedor_id, valor_total, total_items, total_piezas, estado, origen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', 'FIREBIRD_SGLOJA_REAL')
    `, [
      numPedido,
      pedidoNormalizado.cliente_codigo,
      pedidoNormalizado.cliente_nombre,
      pedidoNormalizado.cliente_ciudad,
      pedidoNormalizado.cliente_telefono,
      pedidoNormalizado.vendedor_id,
      pedidoNormalizado.valor_total,
      pedidoNormalizado.total_items,
      pedidoNormalizado.total_piezas
    ]);

    const notaId = resNota.insertId;

    // Insertar ítems reales
    for (const it of (pedidoNormalizado.items || [])) {
      const cant = it.cantidad || it.cantidad_requerida || 1;
      await conn.query(`
        INSERT INTO tbl_nota_items (
          nota_id, num_item, sku, codigo_barra, descripcion, ubicacion,
          cantidad_requerida, cantidad_bipada, precio_unitario, subtotal, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'PENDIENTE')
      `, [
        notaId,
        it.num_item,
        it.sku,
        it.codigo_barra,
        it.descripcion,
        it.ubicacion || 'PAS-01',
        cant,
        it.precio_unitario || it.precio_lista || 0,
        it.subtotal || (cant * (it.precio_unitario || it.precio_lista || 0))
      ]);
    }

    await conn.commit();

    await registrarTransicionEstado(notaId, null, 'PENDIENTE', null, 'FIREBIRD_SYNC', { num_pedido: numPedido });

    const [[notaCreada]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
    const [itemsCreados] = await pool.query('SELECT * FROM tbl_nota_items WHERE nota_id = ? ORDER BY num_item ASC', [notaId]);

    return { nota: notaCreada, items: itemsCreados, yaExistia: false };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Asignar separador a una nota (El reloj de picking arranca de inmediato).
 */
async function asignarSeparadorANota(notaId, separadorId) {
  const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
  if (!nota) throw new Error('Nota no encontrada');

  if (!separadorId) {
    // Remover asignación si estaba pendiente
    await pool.query('UPDATE tbl_notas_deposito SET separador_id = NULL, separador_nombre = NULL WHERE id = ?', [notaId]);
    return { success: true, message: 'Asignación de separador removida' };
  }

  const [[operario]] = await pool.query('SELECT id, nombre, rol FROM tbl_operarios WHERE id = ?', [separadorId]);
  if (!operario) throw new Error('Operario no encontrado');

  const nuevoEstado = 'SEPARANDO';

  await pool.query(`
    UPDATE tbl_notas_deposito 
    SET estado = ?,
        separador_id = ?,
        separador_nombre = ?,
        inicio_separacion = COALESCE(inicio_separacion, NOW())
    WHERE id = ?
  `, [nuevoEstado, operario.id, operario.nombre, notaId]);

  await registrarTransicionEstado(notaId, nota.estado, nuevoEstado, operario.id, operario.nombre, {
    motivo: 'Asignación directa por supervisor (reloj de picking iniciado)'
  });

  await pool.query(`
    INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido)
    VALUES (?, ?, 'ASIGNACION_SUPERVISOR_PICKING', 'NOTA', 1)
  `, [notaId, operario.id]);

  const [[notaActualizada]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
  return { success: true, nota: notaActualizada };
}

// Iniciar proceso de separación (picking) de forma explícita si fuera llamado
async function iniciarPicking(notaId, operarioId) {
  return asignarSeparadorANota(notaId, operarioId);
}

// Registrar escaneo láser / bip
async function registrarBip(notaId, operarioId, barcode) {
  const cleanCode = String(barcode).trim();

  // Buscar si coincide con algún SKU o código de barra de la nota
  const [items] = await pool.query(`
    SELECT * FROM tbl_nota_items 
    WHERE nota_id = ? AND (sku = ? OR codigo_barra = ?)
  `, [notaId, cleanCode, cleanCode]);

  if (items.length === 0) {
    await pool.query(`
      INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido, mensaje_error)
      VALUES (?, ?, ?, 'PRODUCTO', 0, 'Código no pertenece a este pedido')
    `, [notaId, operarioId || 0, cleanCode]);

    return {
      success: false,
      esValido: false,
      message: `El código ${cleanCode} NO pertenece a este pedido.`
    };
  }

  const item = items[0];

  if (item.cantidad_bipada >= item.cantidad_requerida) {
    await pool.query(`
      INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido, mensaje_error)
      VALUES (?, ?, ?, 'PRODUCTO', 0, 'Cantidad requerida ya alcanzada')
    `, [notaId, operarioId || 0, cleanCode]);

    return {
      success: false,
      esValido: false,
      message: `La cantidad de ${item.descripcion} ya está completa (${item.cantidad_requerida}/${item.cantidad_requerida}).`
    };
  }

  const nuevaCantidad = item.cantidad_bipada + 1;
  const nuevoEstado = nuevaCantidad >= item.cantidad_requerida ? 'COMPLETO' : 'PENDIENTE';

  await pool.query(`
    UPDATE tbl_nota_items 
    SET cantidad_bipada = ?, estado = ?
    WHERE id = ?
  `, [nuevaCantidad, nuevoEstado, item.id]);

  await pool.query(`
    UPDATE tbl_notas_deposito 
    SET total_bips_realizados = total_bips_realizados + 1
    WHERE id = ?
  `, [notaId]);

  await pool.query(`
    INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido)
    VALUES (?, ?, ?, 'PRODUCTO', 1)
  `, [notaId, operarioId || 0, cleanCode]);

  // Verificar si quedan pendientes (excluyendo faltantes ya reportados)
  const [[{ pendientes }]] = await pool.query(`
    SELECT COUNT(*) as pendientes FROM tbl_nota_items 
    WHERE nota_id = ? AND cantidad_bipada < cantidad_requerida AND es_faltante = 0
  `, [notaId]);

  return {
    success: true,
    esValido: true,
    item: {
      id: item.id,
      sku: item.sku,
      descripcion: item.descripcion,
      cantidad_bipada: nuevaCantidad,
      cantidad_requerida: item.cantidad_requerida,
      estado: nuevoEstado
    },
    completos: pendientes === 0,
    pendientesRestantes: pendientes
  };
}

/**
 * Finalizar picking y sugerir mesa de destino -> Pasa a ESPERA_CONFIRMACION.
 */
async function finalizarPickingYSugerirMesa(notaId, operarioId, mesaSugeridaCodigo, tiempoNetoSeg) {
  const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
  if (!nota) throw new Error('Nota no encontrada');

  // Sincronizar conteo de faltantes de la nota
  const [[{ faltantesCount }]] = await pool.query(`
    SELECT COUNT(*) as faltantesCount FROM tbl_nota_items WHERE nota_id = ? AND es_faltante = 1
  `, [notaId]);

  const cierreParcial = faltantesCount > 0 ? 1 : 0;

  await pool.query(`
    UPDATE tbl_notas_deposito 
    SET estado = 'ESPERA_CONFIRMACION',
        mesa_sugerida_codigo = ?,
        fin_separacion = NOW(),
        fecha_espera_confirmacion = NOW(),
        tiempo_neto_separacion_seg = ?,
        total_faltantes = ?,
        cierre_parcial = ?
    WHERE id = ?
  `, [mesaSugeridaCodigo, tiempoNetoSeg, faltantesCount, cierreParcial, notaId]);

  await registrarTransicionEstado(notaId, nota.estado, 'ESPERA_CONFIRMACION', operarioId, null, {
    mesaSugerida: mesaSugeridaCodigo,
    tiempoNetoSeg,
    cierreParcial: cierreParcial === 1,
    totalFaltantes: faltantesCount
  });

  await pool.query(`
    INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido)
    VALUES (?, ?, ?, 'MESA', 1)
  `, [notaId, operarioId || 0, `SUGERENCIA_MESA_${mesaSugeridaCodigo}`]);

  return { 
    success: true, 
    estado: 'ESPERA_CONFIRMACION', 
    mesaSugerida: mesaSugeridaCodigo,
    cierreParcial: cierreParcial === 1,
    totalFaltantes: faltantesCount
  };
}

// Entregar a mesa numerada (compatibilidad hacia atrás para llamadas directas)
async function entregarAMesa(notaId, operarioId, mesaCodigo, tiempoNetoSeg) {
  return finalizarPickingYSugerirMesa(notaId, operarioId, mesaCodigo, tiempoNetoSeg);
}

/**
 * Confirmación de Mesa por el Supervisor (Nelson u otro supervisor).
 * Asigna la mesa definitiva y pasa la nota a ASIGNADO_MESA (en cola pausada).
 */
async function confirmarMesaSupervisor(notaId, supervisorId, mesaCodigo) {
  const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
  if (!nota) throw new Error('Nota no encontrada');

  const [[supervisor]] = await pool.query('SELECT id, nombre FROM tbl_operarios WHERE id = ?', [supervisorId]);
  const supervisorNombre = supervisor ? supervisor.nombre : 'Supervisor';

  // Calcular tiempo de espera de confirmación
  const startWait = nota.fecha_espera_confirmacion ? new Date(nota.fecha_espera_confirmacion).getTime() : Date.now();
  const tiempoEsperaSeg = Math.max(0, Math.round((Date.now() - startWait) / 1000));

  const [[mesa]] = await pool.query('SELECT * FROM tbl_mesas WHERE codigo = ?', [mesaCodigo]);
  const mesaId = mesa ? mesa.id : null;

  await pool.query(`
    UPDATE tbl_notas_deposito 
    SET estado = 'ASIGNADO_MESA',
        mesa_id = ?,
        mesa_codigo = ?,
        supervisor_confirmacion_id = ?,
        supervisor_confirmacion_nombre = ?,
        tiempo_espera_confirmacion_seg = ?
    WHERE id = ?
  `, [mesaId, mesaCodigo, supervisorId, supervisorNombre, tiempoEsperaSeg, notaId]);

  if (mesaCodigo) {
    await pool.query('UPDATE tbl_mesas SET estado = "CON_NOTAS" WHERE codigo = ?', [mesaCodigo]);
  }

  await registrarTransicionEstado(notaId, nota.estado, 'ASIGNADO_MESA', supervisorId, supervisorNombre, {
    mesaConfirmada: mesaCodigo,
    mesaSugeridaPrevia: nota.mesa_sugerida_codigo,
    tiempoEsperaConfirmacionSeg: tiempoEsperaSeg
  });

  return {
    success: true,
    estado: 'ASIGNADO_MESA',
    mesaCodigo,
    supervisorNombre,
    tiempoEsperaSeg
  };
}

// Pausas de jornada
async function isPausaGlobalActiva() {
  const [[config]] = await pool.query("SELECT valor FROM tbl_configuracion WHERE clave = 'PAUSA_GLOBAL_ACTIVA'");
  return config && config.valor === '1';
}

async function getPausasRegistradas(fechaInicio) {
  const [rows] = await pool.query(`
    SELECT * FROM tbl_pausas_jornada 
    WHERE inicio_pausa >= ? OR activo = 1
  `, [fechaInicio || new Date(0)]);
  return rows;
}

// -------------------------------------------------------------
// OPERACIONES DE MESA / BANCADA (REVISIÓN Y EMPAQUE)
// -------------------------------------------------------------
async function getColaMesa(mesaCodigo) {
  const [[mesa]] = await pool.query('SELECT * FROM tbl_mesas WHERE codigo = ?', [mesaCodigo]);
  if (!mesa) return null;

  const [notas] = await pool.query(`
    SELECT n.*, 
      TIMESTAMPDIFF(SECOND, COALESCE(n.fecha_espera_confirmacion, n.fin_separacion, NOW()), NOW()) as tiempo_espera_seg
    FROM tbl_notas_deposito n
    WHERE n.mesa_codigo = ? AND n.estado IN ('ASIGNADO_MESA', 'EN_MESA')
    ORDER BY CASE n.estado 
      WHEN 'EN_MESA' THEN 1 
      WHEN 'ASIGNADO_MESA' THEN 2 
      ELSE 3 END, 
      n.fecha_ingreso ASC
  `, [mesaCodigo]);

  return { mesa, notas };
}

/**
 * Iniciar empaque / revisión en mesa (Activa el cronómetro de la mesa con el 1er escaneo).
 */
async function iniciarRevisionMesa(notaId, guardadorId) {
  let guardadorNombre = 'Conferencista';
  if (guardadorId) {
    const [[op]] = await pool.query('SELECT nombre FROM tbl_operarios WHERE id = ?', [guardadorId]);
    if (op) guardadorNombre = op.nombre;
  }

  const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
  if (!nota) throw new Error('Nota no encontrada');

  const nuevoEstado = 'EN_MESA';

  await pool.query(`
    UPDATE tbl_notas_deposito 
    SET estado = ?,
        guardador_id = ?,
        guardador_nombre = ?,
        inicio_mesa = COALESCE(inicio_mesa, NOW())
    WHERE id = ?
  `, [nuevoEstado, guardadorId || null, guardadorNombre, notaId]);

  if (nota.mesa_codigo) {
    await pool.query('UPDATE tbl_mesas SET estado = "EN_REVISION" WHERE codigo = ?', [nota.mesa_codigo]);
  }

  await registrarTransicionEstado(notaId, nota.estado, nuevoEstado, guardadorId, guardadorNombre, {
    motivo: 'Primer producto escaneado / inicio de empaque'
  });

  await pool.query(`
    INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido)
    VALUES (?, ?, 'INICIO_REVISION_MESA', 'MESA', 1)
  `, [notaId, guardadorId || 0]);

  return { success: true, estado: nuevoEstado };
}

/**
 * Finalizar revisión en mesa. Si es_mostrador -> RETIRADO_MOSTRADOR, sino LISTO_PARA_ENVIO.
 */
async function finalizarRevisionMesa(notaId, guardadorId, tiempoNetoMesaSeg, esMostrador = false) {
  const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
  if (!nota) return { success: false, error: 'Nota no encontrada' };

  const tiempoTotalCiclo = (nota.tiempo_neto_separacion_seg || 0) + (tiempoNetoMesaSeg || 0);
  const esRetiroLocal = esMostrador || nota.es_mostrador === 1;
  const nuevoEstado = esRetiroLocal ? 'RETIRADO_MOSTRADOR' : 'LISTO_PARA_ENVIO';

  await pool.query(`
    UPDATE tbl_notas_deposito 
    SET estado = ?,
        fin_mesa = NOW(),
        tiempo_neto_mesa_seg = ?,
        tiempo_total_ciclo_seg = ?,
        guardador_id = COALESCE(?, guardador_id),
        es_mostrador = ?
    WHERE id = ?
  `, [nuevoEstado, tiempoNetoMesaSeg, tiempoTotalCiclo, guardadorId || null, esRetiroLocal ? 1 : 0, notaId]);

  // Actualizar estado de la mesa física
  if (nota.mesa_codigo) {
    const [[{ restantes }]] = await pool.query(`
      SELECT COUNT(*) as restantes FROM tbl_notas_deposito 
      WHERE mesa_codigo = ? AND estado IN ('ASIGNADO_MESA', 'EN_MESA')
    `, [nota.mesa_codigo]);

    const nuevoEstadoMesa = restantes > 0 ? 'CON_NOTAS' : 'LIBRE';
    await pool.query('UPDATE tbl_mesas SET estado = ? WHERE codigo = ?', [nuevoEstadoMesa, nota.mesa_codigo]);
  }

  await registrarTransicionEstado(notaId, nota.estado, nuevoEstado, guardadorId, null, {
    tiempoNetoMesaSeg,
    tiempoTotalCiclo,
    esMostrador: esRetiroLocal
  });

  await pool.query(`
    INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido)
    VALUES (?, ?, 'FIN_REVISION_MESA', 'MESA', 1)
  `, [notaId, guardadorId || 0]);

  return {
    success: true,
    estado: nuevoEstado,
    esMostrador: esRetiroLocal,
    tiempoNetoMesaSeg,
    tiempoTotalCicloSeg: tiempoTotalCiclo
  };
}

/**
 * Consulta de estado general para el panel del Supervisor (Separadores libres, Cargas de mesas y Espera de confirmación).
 */
async function getSupervisionEstadoGeneral() {
  // 1. Separadores y su estado actual
  const [separadores] = await pool.query(`
    SELECT o.id, o.codigo, o.nombre, o.rol,
      n.id as nota_id, n.num_pedido, n.cliente_nombre, n.inicio_separacion, n.estado as nota_estado,
      TIMESTAMPDIFF(SECOND, n.inicio_separacion, NOW()) as transcurrido_seg
    FROM tbl_operarios o
    LEFT JOIN tbl_notas_deposito n ON n.separador_id = o.id AND n.estado IN ('SEPARANDO', 'ERROR_SEPARACION')
    WHERE o.rol = 'SEPARADOR' AND o.activo = 1
    ORDER BY o.nombre ASC
  `);

  const listaSeparadores = separadores.map(s => ({
    id: s.id,
    codigo: s.codigo,
    nombre: s.nombre,
    libre: !s.nota_id,
    notaActual: s.nota_id ? {
      id: s.nota_id,
      num_pedido: s.num_pedido,
      cliente_nombre: s.cliente_nombre,
      estado: s.nota_estado,
      inicio_separacion: s.inicio_separacion,
      transcurrido_seg: s.transcurrido_seg
    } : null
  }));

  // 2. Mesas y carga actual
  const [mesas] = await pool.query('SELECT * FROM tbl_mesas ORDER BY codigo ASC');
  const [cargas] = await pool.query(`
    SELECT mesa_codigo, COUNT(*) as cantidad
    FROM tbl_notas_deposito
    WHERE estado IN ('ASIGNADO_MESA', 'EN_MESA')
    GROUP BY mesa_codigo
  `);

  const mapaCarga = {};
  cargas.forEach(c => { mapaCarga[c.mesa_codigo] = c.cantidad; });

  const listaMesas = mesas.map(m => {
    const cant = mapaCarga[m.codigo] || 0;
    let color = 'VERDE';
    let nivel = 'Despejada';
    if (cant >= 2 && cant <= 4) {
      color = 'NARANJA';
      nivel = 'Moderada';
    } else if (cant > 4) {
      color = 'ROJO';
      nivel = 'Saturada';
    }

    return {
      id: m.id,
      codigo: m.codigo,
      nombre: m.nombre,
      estado_mesa: m.estado,
      notas_en_cola: cant,
      color,
      nivel
    };
  });

  // 3. Notas en espera de confirmación
  const [esperas] = await pool.query(`
    SELECT id, num_pedido, cliente_nombre, separador_id, separador_nombre,
      mesa_sugerida_codigo, total_piezas, total_items, tiempo_neto_separacion_seg,
      fecha_espera_confirmacion,
      TIMESTAMPDIFF(SECOND, fecha_espera_confirmacion, NOW()) as segundos_espera
    FROM tbl_notas_deposito
    WHERE estado = 'ESPERA_CONFIRMACION'
    ORDER BY fecha_espera_confirmacion ASC
  `);

  const listaEsperaConfirmacion = esperas.map(e => ({
    ...e,
    alerta_demora: (e.segundos_espera || 0) >= 180, // > 3 min
    segundos_espera: e.segundos_espera || 0
  }));

  return {
    separadores: listaSeparadores,
    separadoresLibresCount: listaSeparadores.filter(s => s.libre).length,
    separadoresOcupadosCount: listaSeparadores.filter(s => !s.libre).length,
    mesas: listaMesas,
    esperaConfirmacion: listaEsperaConfirmacion,
    esperaConfirmacionCount: listaEsperaConfirmacion.length,
    alertasDemoraCount: listaEsperaConfirmacion.filter(e => e.alerta_demora).length
  };
}

// ============================================================
// 14. GESTIÓN DE DISCREPANCIAS Y FALTANTES (FASE 8)
// REGLA ABSOLUTA: LECTURA PURA DE FIREBIRD ERP (SELECT)
// TODAS LAS MUTACIONES Y RESOLUCIONES OCURREN EN MYSQL (mendes_db)
// ============================================================

/**
 * Reportar faltante de un producto (Botón "No Hay" en app-picking).
 * - Consulta Firebird con SELECT puro.
 * - Registra la discrepancia en MySQL.
 * - El reloj de picking continúa corriendo.
 */
async function reportarFaltante(notaId, itemId, operarioId, motivo = '') {
  const cleanNota = String(notaId).trim();
  const [[nota]] = await pool.query(
    'SELECT * FROM tbl_notas_deposito WHERE id = ? OR num_pedido = ?', 
    [cleanNota, cleanNota]
  );
  if (!nota) throw new Error('Nota no encontrada');

  const cleanItem = String(itemId).trim();
  const [[item]] = await pool.query(`
    SELECT * FROM tbl_nota_items 
    WHERE nota_id = ? AND (id = ? OR sku = ? OR codigo_barra = ?)
  `, [nota.id, cleanItem, cleanItem, cleanItem]);

  if (!item) throw new Error('Ítem no encontrado en esta nota');

  const [[operario]] = await pool.query('SELECT id, nombre FROM tbl_operarios WHERE id = ?', [operarioId]);
  const operarioNombre = operario ? operario.nombre : (nota.separador_nombre || 'Separador');

  // Consulta 100% SOLO LECTURA (SELECT) a Firebird ERP
  const stockInfo = await consultarStockTeoricoFirebird(item.sku);
  const stockTeorico = stockInfo && stockInfo.success ? (stockInfo.stock_fisico || 0) : 0;

  // Actualizar el ítem en MySQL usando su ID real
  await pool.query(`
    UPDATE tbl_nota_items 
    SET es_faltante = 1, estado = 'DIFERENCIA'
    WHERE id = ?
  `, [item.id]);

  // Insertar en tbl_discrepancias_stock (MySQL)
  const [resDisc] = await pool.query(`
    INSERT INTO tbl_discrepancias_stock (
      nota_id, num_pedido, sku, codigo_barra, descripcion,
      cantidad_requerida, stock_teorico_firebird,
      separador_id, separador_nombre, estado, resolucion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_REVISION', ?)
  `, [
    notaId,
    nota.num_pedido,
    item.sku,
    item.codigo_barra,
    item.descripcion,
    item.cantidad_requerida - item.cantidad_bipada,
    stockTeorico,
    operarioId,
    operarioNombre,
    motivo ? String(motivo).trim() : 'Separador reportó falta física en estante'
  ]);

  // Auditoría forense en MySQL
  await pool.query(`
    INSERT INTO tbl_bips_log (nota_id, operario_id, codigo_leido, tipo_lectura, es_valido, mensaje_error)
    VALUES (?, ?, ?, 'PRODUCTO', 0, ?)
  `, [notaId, operarioId, item.sku, `FALTANTE_REPORTADO: ${item.descripcion}`]);

  const requiereVerificacionFisica = stockTeorico > 0;

  // Verificar cuántos ítems quedan pendientes de bipar (excluyendo faltantes)
  const [[{ pendientesRestantes }]] = await pool.query(`
    SELECT COUNT(*) as pendientesRestantes FROM tbl_nota_items 
    WHERE nota_id = ? AND cantidad_bipada < cantidad_requerida AND es_faltante = 0
  `, [notaId]);

  return {
    success: true,
    discrepanciaId: resDisc.insertId,
    sku: item.sku,
    descripcion: item.descripcion,
    stockTeoricoFirebird: stockTeorico,
    requiereVerificacionFisica,
    ubicacionEstanteFirebird: stockInfo ? stockInfo.ubicacion_estante : 'SIN ASIGNAR',
    pendientesRestantes,
    pickingCompleto: pendientesRestantes === 0,
    mensaje: requiereVerificacionFisica
      ? `Faltante registrado. El ERP indica ${stockTeorico} unid. en sistema; se generó alerta de verificación física para el supervisor.`
      : 'Faltante registrado. Stock en sistema está en 0.'
  };
}

/**
 * Obtener lista de discrepancias de stock.
 */
async function getDiscrepancias(filtros = {}) {
  let sql = `
    SELECT d.*, n.cliente_nombre, n.mesa_codigo
    FROM tbl_discrepancias_stock d
    JOIN tbl_notas_deposito n ON n.id = d.nota_id
    WHERE 1=1
  `;
  const params = [];

  if (filtros.estado) {
    sql += ' AND d.estado = ?';
    params.push(filtros.estado);
  }
  if (filtros.notaId) {
    sql += ' AND d.nota_id = ?';
    params.push(filtros.notaId);
  }
  if (filtros.soloPendientes) {
    sql += " AND d.estado = 'PENDIENTE_REVISION'";
  }

  sql += ' ORDER BY d.created_at DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Resolver discrepancia por parte del supervisor.
 */
async function resolverDiscrepancia(discrepanciaId, supervisorId, resolucionData = {}) {
  const [[disc]] = await pool.query('SELECT * FROM tbl_discrepancias_stock WHERE id = ?', [discrepanciaId]);
  if (!disc) throw new Error('Discrepancia no encontrada');

  const [[sup]] = await pool.query('SELECT id, nombre FROM tbl_operarios WHERE id = ?', [supervisorId]);
  const supervisorNombre = sup ? sup.nombre : 'Supervisor';

  const { accion, comentario, nuevaUbicacion } = resolucionData;

  if (accion === 'CONFIRMAR_FALTANTE') {
    // 1. Confirmar faltante en MySQL
    await pool.query(`
      UPDATE tbl_discrepancias_stock 
      SET estado = 'CONFIRMADO_FALTANTE',
          supervisor_id = ?,
          supervisor_nombre = ?,
          resolucion = ?,
          fecha_resolucion = NOW()
      WHERE id = ?
    `, [supervisorId, supervisorNombre, comentario || 'Faltante físico confirmado por supervisor. Cierre parcial aprobado sin penalización.', discrepanciaId]);

    // 2. Marcar ítem como faltante aprobado en tbl_nota_items
    await pool.query(`
      UPDATE tbl_nota_items
      SET faltante_aprobado = 1
      WHERE nota_id = ? AND sku = ?
    `, [disc.nota_id, disc.sku]);

    // 3. Actualizar la nota: incremento de total_faltantes y flag cierre_parcial = 1
    await pool.query(`
      UPDATE tbl_notas_deposito
      SET total_faltantes = total_faltantes + 1,
          cierre_parcial = 1
      WHERE id = ?
    `, [disc.nota_id]);

    return {
      success: true,
      estado: 'CONFIRMADO_FALTANTE',
      mensaje: 'Faltante aprobado. La nota queda habilitada para cierre parcial sin penalizar tiempos del separador.'
    };
  } else if (accion === 'HALLADO_EN_DEPOSITO') {
    // Producto fue encontrado físicamente por el supervisor
    await pool.query(`
      UPDATE tbl_discrepancias_stock 
      SET estado = 'HALLADO_EN_DEPOSITO',
          supervisor_id = ?,
          supervisor_nombre = ?,
          resolucion = ?,
          fecha_resolucion = NOW()
      WHERE id = ?
    `, [supervisorId, supervisorNombre, comentario || `Producto hallado en: ${nuevaUbicacion || 'depósito'}`, discrepanciaId]);

    // Restaurar el ítem para que el separador lo pueda bipar
    await pool.query(`
      UPDATE tbl_nota_items
      SET es_faltante = 0,
          ubicacion = COALESCE(?, ubicacion),
          estado = 'PENDIENTE'
      WHERE nota_id = ? AND sku = ?
    `, [nuevaUbicacion || null, disc.nota_id, disc.sku]);

    return {
      success: true,
      estado: 'HALLADO_EN_DEPOSITO',
      nuevaUbicacion: nuevaUbicacion || 'depósito',
      mensaje: `Producto hallado. El separador puede completar la separación en la ubicación: ${nuevaUbicacion || 'depósito'}.`
    };
  } else {
    throw new Error(`Acción desconocida: ${accion}`);
  }
}

/**
 * Reporte de Discrepancias Recurrentes:
 * Artículos con 3 o más faltantes reportados en los últimos 7 días.
 */
async function getDiscrepanciasRecurrentesSemana() {
  const [rows] = await pool.query(`
    SELECT 
      sku,
      descripcion,
      COUNT(*) as total_reportes_semana,
      SUM(CASE WHEN estado = 'CONFIRMADO_FALTANTE' THEN 1 ELSE 0 END) as confirmados_faltante,
      SUM(CASE WHEN estado = 'HALLADO_EN_DEPOSITO' THEN 1 ELSE 0 END) as hallados_en_deposito,
      MAX(stock_teorico_firebird) as ultimo_stock_teorico,
      MAX(created_at) as ultimo_reporte
    FROM tbl_discrepancias_stock
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY sku, descripcion
    HAVING COUNT(*) >= 3
    ORDER BY total_reportes_semana DESC
  `);
  return rows;
}

module.exports = {
  initDatabase,
  getOperarios,
  getOperariosStats,
  getNextSuggestedCode,
  guardarOperario,
  toggleActivoOperario,
  resetPinOperario,
  getMesas,
  registrarNotaDesdeFirebird,
  asignarSeparadorANota,
  iniciarPicking,
  registrarBip,
  finalizarPickingYSugerirMesa,
  confirmarMesaSupervisor,
  entregarAMesa,
  isPausaGlobalActiva,
  getPausasRegistradas,
  getColaMesa,
  iniciarRevisionMesa,
  finalizarRevisionMesa,
  getSupervisionEstadoGeneral,
  registrarTransicionEstado,
  reportarFaltante,
  getDiscrepancias,
  resolverDiscrepancia,
  getDiscrepanciasRecurrentesSemana,
  sincronizarOperariosDesdeFirebird
};
