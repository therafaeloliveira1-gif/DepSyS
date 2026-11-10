const express = require('express');
const router = express.Router();

const { 
  getPedidoReal, 
  listarPedidosPendientesFirebird, 
  buscarClientesFirebird 
} = require('../services/orderService');
const {
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
  reportarFaltante,
  getDiscrepancias,
  resolverDiscrepancia,
  getDiscrepanciasRecurrentesSemana,
  sincronizarOperariosDesdeFirebird
} = require('../repositories/depositRepository');
const { calcularTiempoNeto, formatearSegundos } = require('../domain/timeEngine');
const pool = require('../config/db');

// ============================================================
// 1. ESTADO GENERAL Y PAUSA MAESTRA DEL SUPERVISOR
// ============================================================
router.get('/status', async (req, res) => {
  try {
    const isPaused = await isPausaGlobalActiva();
    const [[stats]] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'SEPARANDO' THEN 1 END) as separando,
        COUNT(CASE WHEN estado = 'ESPERA_CONFIRMACION' THEN 1 END) as espera_confirmacion,
        COUNT(CASE WHEN estado IN ('EN_MESA', 'ASIGNADO_MESA') THEN 1 END) as en_mesa,
        COUNT(CASE WHEN estado = 'EN_MESA' THEN 1 END) as revisando,
        COUNT(CASE WHEN estado IN ('FINALIZADO', 'LISTO_PARA_ENVIO', 'RETIRADO_MOSTRADOR', 'ENVIADO') THEN 1 END) as finalizados
      FROM tbl_notas_deposito
    `);

    res.json({
      success: true,
      pausaGlobalActiva: isPaused,
      stats: {
        pendientes: stats.pendientes || 0,
        separando: stats.separando || 0,
        espera_confirmacion: stats.espera_confirmacion || 0,
        en_mesa: stats.en_mesa || 0,
        revisando: stats.revisando || 0,
        finalizados: stats.finalizados || 0
      },
      servidor: {
        horaActual: new Date().toISOString(),
        version: '2.1.0-fundacion'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/pausa/toggle-global', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const isPaused = await isPausaGlobalActiva();
      if (isPaused) {
        // Reanudar jornada
        await conn.query("UPDATE tbl_configuracion SET valor = '0' WHERE clave = 'PAUSA_GLOBAL_ACTIVA'");
        await conn.query(`
          UPDATE tbl_pausas_jornada 
          SET fin_pausa = NOW(), 
              duracion_segundos = TIMESTAMPDIFF(SECOND, inicio_pausa, NOW()), 
              activo = 0 
          WHERE tipo = 'GLOBAL_SUPERVISOR' AND activo = 1
        `);
        res.json({ success: true, estado: 'REANUDADO', message: 'Jornada reanudada para todos los operarios del depósito.' });
      } else {
        // Pausar jornada
        await conn.query("UPDATE tbl_configuracion SET valor = '1' WHERE clave = 'PAUSA_GLOBAL_ACTIVA'");
        await conn.query(`
          INSERT INTO tbl_pausas_jornada (tipo, motivo, inicio_pausa, activo)
          VALUES ('GLOBAL_SUPERVISOR', 'Pausa general de depósito activada por supervisor', NOW(), 1)
        `);
        res.json({ success: true, estado: 'PAUSADO', message: 'Jornada pausada globalmente. Cronómetros congelados.' });
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 2. OPERARIOS Y MESAS (CORE PERSONAL & SEGURIDAD)
// ============================================================
async function handleGetOperarios(req, res) {
  try {
    const { rol, todos, include_inactive, all, sugerir_codigo } = req.query;

    if (sugerir_codigo) {
      const codigoSugerido = await getNextSuggestedCode(sugerir_codigo);
      return res.json({
        success: true,
        rol: sugerir_codigo,
        codigo_sugerido: codigoSugerido
      });
    }

    const incluirInactivos = !!(todos || include_inactive || all);
    const operarios = await getOperarios(rol, incluirInactivos);
    const stats = await getOperariosStats();

    res.json({
      success: true,
      total: operarios.length,
      stats,
      operarios
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function handlePostOperarios(req, res) {
  try {
    const { action = 'save', codigo, pin, rol, nombre, activo, mesa_codigo, permisos_custom } = req.body;

    if (action === 'toggle_activo') {
      const result = await toggleActivoOperario(codigo);
      return res.json(result);
    }

    if (action === 'reset_pin') {
      const result = await resetPinOperario(codigo, pin);
      return res.json(result);
    }

    const result = await guardarOperario({
      codigo,
      nombre,
      rol,
      pin,
      activo,
      mesa_codigo,
      permisos_custom
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

router.get('/operarios', handleGetOperarios);
router.get('/operarios.php', handleGetOperarios);
router.post('/operarios', handlePostOperarios);
router.post('/operarios.php', handlePostOperarios);

router.post('/operarios/sincronizar-firebird', async (req, res) => {
  try {
    const resultado = await sincronizarOperariosDesdeFirebird();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/mesas', async (req, res) => {
  try {
    const mesas = await getMesas();
    res.json({ success: true, mesas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/mesas/:codigo/cola', async (req, res) => {
  try {
    const data = await getColaMesa(req.params.codigo);
    if (!data) {
      return res.status(404).json({ success: false, error: `Mesa ${req.params.codigo} no existe` });
    }

    const formattedNotas = data.notas.map(n => ({
      ...n,
      tiempo_separacion_fmt: formatearSegundos(n.tiempo_neto_separacion_seg),
      tiempo_espera_fmt: formatearSegundos(n.tiempo_espera_seg)
    }));

    res.json({
      success: true,
      mesa: data.mesa,
      notas: formattedNotas,
      totalEnEspera: formattedNotas.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/mesa/iniciar', async (req, res) => {
  try {
    const { notaId, guardadorId } = req.body;
    if (!notaId) return res.status(400).json({ success: false, error: 'notaId es requerido' });

    const result = await iniciarRevisionMesa(notaId, guardadorId);
    res.json({ success: true, message: 'Revisión en mesa iniciada', estado: result.estado, inicio: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/mesa/finalizar', async (req, res) => {
  try {
    const { notaId, guardadorId, esMostrador } = req.body;
    if (!notaId) return res.status(400).json({ success: false, error: 'notaId es requerido' });

    const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
    if (!nota) return res.status(404).json({ success: false, error: 'Nota no encontrada' });

    // Obtener pausas registradas durante el empaque
    const pausas = await getPausasRegistradas(nota.inicio_mesa || nota.fin_separacion);

    // Calcular tiempo neto de mesa descontando pausas / noche / café / almuerzo
    const inicioMesa = nota.inicio_mesa || new Date();
    const tiempoNetoMesaSeg = calcularTiempoNeto(inicioMesa, new Date(), pausas, {
      permiteHoraExtra: nota.permite_hora_extra === 1
    });

    const result = await finalizarRevisionMesa(notaId, guardadorId, tiempoNetoMesaSeg, esMostrador);

    res.json({
      success: true,
      message: result.esMostrador ? 'Nota entregada en mostrador al cliente' : 'Nota empaquetada y lista para envío',
      estado: result.estado,
      esMostrador: result.esMostrador,
      tiempoNetoMesaSeg,
      tiempoNetoMesaFmt: formatearSegundos(tiempoNetoMesaSeg),
      tiempoTotalCicloSeg: result.tiempoTotalCicloSeg,
      tiempoTotalCicloFmt: formatearSegundos(result.tiempoTotalCicloSeg)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 3. CONSULTA EN VIVO DE PEDIDOS (FIREBIRD SGLOJA)
// ============================================================

// Listar pedidos pendientes en espera desde Firebird (con estatus en depósito)
router.get('/firebird/pendientes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const fbRes = await listarPedidosPendientesFirebird(limit);
    if (!fbRes.success) {
      return res.status(500).json(fbRes);
    }

    // 1. Guardar automáticamente cada pedido extraído en MySQL (tbl_notas_deposito)
    for (const p of fbRes.pedidos) {
      const cleanNum = String(p.num_pedido).trim();
      await pool.query(`
        INSERT INTO tbl_notas_deposito (
          num_pedido, cliente_codigo, cliente_nombre, cliente_ciudad, cliente_telefono,
          vendedor_id, valor_total, total_items, total_piezas, estado, origen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', 'FIREBIRD_SGLOJA_REAL')
        ON DUPLICATE KEY UPDATE
          valor_total = VALUES(valor_total),
          total_items = VALUES(total_items),
          total_piezas = VALUES(total_piezas),
          cliente_nombre = VALUES(cliente_nombre),
          cliente_codigo = VALUES(cliente_codigo)
      `, [
        cleanNum,
        p.cliente_codigo || '',
        p.cliente_nombre || '',
        p.cliente_ciudad || '',
        p.cliente_telefono || '',
        p.vendedor_id || 0,
        p.valor_total || 0,
        p.total_items || 0,
        p.total_piezas || 0
      ]);
    }

    // 2. Cruzar con notas ya registradas en MySQL
    const [notasLocales] = await pool.query(`
      SELECT id, num_pedido, estado, es_mostrador, separador_id, separador_nombre, fecha_ingreso, 
             supervisor_aprobador_nombre, fecha_aprobacion_credito
      FROM tbl_notas_deposito
    `);
    const mapLocales = new Map(notasLocales.map(n => [String(n.num_pedido).trim(), n]));

    const pedidosConEstado = fbRes.pedidos.map(p => {
      const local = mapLocales.get(String(p.num_pedido).trim());
      return {
        ...p,
        id_deposito: local ? local.id : null,
        estado_deposito: local ? local.estado : 'PENDIENTE',
        es_mostrador: local ? Boolean(local.es_mostrador) : false,
        separador_nombre: local ? local.separador_nombre : null,
        supervisor_aprobador_nombre: local ? local.supervisor_aprobador_nombre : null,
        fecha_aprobacion_credito: local ? local.fecha_aprobacion_credito : null
      };
    });

    res.json({
      success: true,
      total: pedidosConEstado.length,
      pedidos: pedidosConEstado
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inspeccionar un pedido en detalle: productos, descuentos y análisis de crédito del cliente
router.get('/firebird/pedidos/:num_pedido', async (req, res) => {
  try {
    const numPedido = req.params.num_pedido;
    const fbRes = await getPedidoReal(numPedido);
    if (!fbRes.success) {
      return res.status(404).json(fbRes);
    }

    // Buscar si ya tiene registro local
    const [[local]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE num_pedido = ?', [numPedido]);

    res.json({
      success: true,
      pedido: {
        ...fbRes.pedido,
        id_deposito: local ? local.id : null,
        estado_deposito: local ? local.estado : 'EN_ESPERA_FIREBIRD',
        separador_id: local ? local.separador_id : null,
        separador_nombre: local ? local.separador_nombre : null,
        mesa_codigo: local ? local.mesa_codigo : null,
        supervisor_aprobador_nombre: local ? local.supervisor_aprobador_nombre : null,
        fecha_aprobacion_credito: local ? local.fecha_aprobacion_credito : null,
        motivo_retencion: local ? local.motivo_retencion : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Aprobar pedido comercial / crediticio y pasar a CONFIRMADO (listo para depósito)
router.post('/pedidos/aprobar-credito', async (req, res) => {
  try {
    const { numPedido, supervisorId, supervisorNombre, comentario, itemsModificados } = req.body;
    if (!numPedido) {
      return res.status(400).json({ success: false, error: 'numPedido es requerido' });
    }

    // 1. Obtener datos frescos de Firebird
    const fbRes = await getPedidoReal(numPedido);
    if (!fbRes.success) {
      return res.status(404).json(fbRes);
    }

    // 2. Registrar o actualizar en MySQL
    const regRes = await registrarNotaDesdeFirebird(fbRes.pedido);
    const notaId = regRes.nota.id;

    // 2.1 Si se modificaron o excluyeron ítems en la revisión del supervisor:
    if (Array.isArray(itemsModificados) && itemsModificados.length > 0) {
      await pool.query('DELETE FROM tbl_nota_items WHERE nota_id = ?', [notaId]);
      let nuevoTotalPiezas = 0;
      let nuevoValorTotal = 0;
      for (const it of itemsModificados) {
        const cant = Number(it.cantidad || it.cantidad_requerida || 1);
        const pUnit = Number(it.precio_unitario || it.precio_lista || 0);
        const pDesc = Number(it.porcentaje_descuento || 0);
        const sub = it.subtotal !== undefined ? Number(it.subtotal) : (cant * pUnit * (1 - (pDesc / 100)));
        nuevoTotalPiezas += cant;
        nuevoValorTotal += sub;
        await pool.query(`
          INSERT INTO tbl_nota_items (
            nota_id, num_item, sku, codigo_barra, descripcion, ubicacion,
            cantidad_requerida, cantidad_bipada, precio_unitario, subtotal, estado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'PENDIENTE')
        `, [
          notaId,
          it.num_item || 1,
          String(it.sku || it.codigo_barra || ''),
          String(it.codigo_barra || it.sku || ''),
          String(it.descripcion || 'REPUESTO'),
          it.ubicacion || 'PAS-01',
          cant,
          pUnit,
          sub
        ]);
      }
      await pool.query(`
        UPDATE tbl_notas_deposito 
        SET total_items = ?, total_piezas = ?, valor_total = ?
        WHERE id = ?
      `, [itemsModificados.length, nuevoTotalPiezas, nuevoValorTotal, notaId]);
    }

    // 3. Cambiar estado a CONFIRMADO
    await pool.query(`
      UPDATE tbl_notas_deposito 
      SET estado = 'CONFIRMADO',
          supervisor_aprobador_id = ?,
          supervisor_aprobador_nombre = ?,
          fecha_aprobacion_credito = NOW(),
          observaciones = CONCAT(COALESCE(observaciones, ''), '\n[APROBADO CRÉDITO] ', ?)
      WHERE id = ?
    `, [supervisorId || null, supervisorNombre || 'Supervisor', comentario || 'Aprobado para depósito', notaId]);

    // Registrar en historial
    await pool.query(`
      INSERT INTO tbl_estados_historial (nota_id, estado_anterior, estado_nuevo, operario_id, operario_nombre, detalles)
      VALUES (?, 'PENDIENTE', 'CONFIRMADO', ?, ?, ?)
    `, [notaId, supervisorId || null, supervisorNombre || 'Supervisor', JSON.stringify({ accion: 'APROBACION_CREDITO', comentario })]);

    res.json({
      success: true,
      message: `Pedido #${numPedido} aprobado exitosamente y pasado a depósito.`,
      notaId,
      estado: 'CONFIRMADO'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Retener pedido por crédito
router.post('/pedidos/retener-credito', async (req, res) => {
  try {
    const { numPedido, supervisorId, supervisorNombre, motivo } = req.body;
    if (!numPedido) return res.status(400).json({ success: false, error: 'numPedido es requerido' });

    // Sincronizar si aún no existe
    const fbRes = await getPedidoReal(numPedido);
    if (!fbRes.success) return res.status(404).json(fbRes);
    const regRes = await registrarNotaDesdeFirebird(fbRes.pedido);
    const notaId = regRes.nota.id;

    await pool.query(`
      UPDATE tbl_notas_deposito 
      SET estado = 'EN_ESPERA',
          motivo_retencion = ?,
          supervisor_aprobador_id = ?,
          supervisor_aprobador_nombre = ?
      WHERE id = ?
    `, [motivo || 'Puesto en espera para evaluación comercial', supervisorId || null, supervisorNombre || 'Supervisor', notaId]);

    await pool.query(`
      INSERT INTO tbl_estados_historial (nota_id, estado_anterior, estado_nuevo, operario_id, operario_nombre, detalles)
      VALUES (?, 'PENDIENTE', 'EN_ESPERA', ?, ?, ?)
    `, [notaId, supervisorId || null, supervisorNombre || 'Supervisor', JSON.stringify({ accion: 'PASAR_A_ESPERA', motivo })]);

    res.json({
      success: true,
      message: `Pedido #${numPedido} puesto en espera.`,
      notaId,
      estado: 'EN_ESPERA'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rechazar pedido
router.post('/pedidos/rechazar-credito', async (req, res) => {
  try {
    const { numPedido, supervisorId, supervisorNombre, motivo } = req.body;
    if (!numPedido) return res.status(400).json({ success: false, error: 'numPedido es requerido' });

    const fbRes = await getPedidoReal(numPedido);
    if (!fbRes.success) return res.status(404).json(fbRes);
    const regRes = await registrarNotaDesdeFirebird(fbRes.pedido);
    const notaId = regRes.nota.id;

    await pool.query(`
      UPDATE tbl_notas_deposito 
      SET estado = 'CANCELADO',
          motivo_retencion = ?,
          supervisor_aprobador_id = ?,
          supervisor_aprobador_nombre = ?
      WHERE id = ?
    `, [motivo || 'Rechazado en revisión comercial', supervisorId || null, supervisorNombre || 'Supervisor', notaId]);

    await pool.query(`
      INSERT INTO tbl_estados_historial (nota_id, estado_anterior, estado_nuevo, operario_id, operario_nombre, detalles)
      VALUES (?, 'PENDIENTE', 'CANCELADO', ?, ?, ?)
    `, [notaId, supervisorId || null, supervisorNombre || 'Supervisor', JSON.stringify({ accion: 'RECHAZO_COMERCIAL', motivo })]);

    res.json({
      success: true,
      message: `Pedido #${numPedido} rechazado.`,
      notaId,
      estado: 'CANCELADO'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener pedidos confirmados listos para asignar a separadores
router.get('/pedidos/confirmados', async (req, res) => {
  try {
    const [notas] = await pool.query(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM tbl_nota_items WHERE nota_id = n.id) as items_reales_count
      FROM tbl_notas_deposito n
      WHERE n.estado = 'CONFIRMADO'
      ORDER BY n.es_mostrador DESC, COALESCE(n.fecha_aprobacion_credito, n.fecha_ingreso) ASC
    `);

    res.json({
      success: true,
      total: notas.length,
      pedidos: notas
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener pedidos en espera de aprobación crediticia / comercial
router.get('/pedidos/en-espera', async (req, res) => {
  try {
    const [notas] = await pool.query(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM tbl_nota_items WHERE nota_id = n.id) as items_reales_count
      FROM tbl_notas_deposito n
      WHERE n.estado = 'EN_ESPERA'
      ORDER BY n.fecha_ingreso ASC, n.id ASC
    `);

    res.json({
      success: true,
      total: notas.length,
      pedidos: notas
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Consulta de pedido individual histórico
router.get('/pedidos/:num_pedido', async (req, res) => {
  try {
    const numPedido = req.params.num_pedido;
    // 1. Consultar pedido real en Firebird
    const fbRes = await getPedidoReal(numPedido);
    if (!fbRes.success) {
      return res.status(404).json(fbRes);
    }

    // 2. Persistir o sincronizar en mendes_db
    const regRes = await registrarNotaDesdeFirebird(fbRes.pedido);

    res.json({
      success: true,
      pedido: {
        ...fbRes.pedido,
        id_deposito: regRes.nota.id,
        estado_deposito: regRes.nota.estado,
        separador_nombre: regRes.nota.separador_nombre,
        mesa_codigo: regRes.nota.mesa_codigo,
        mesa_sugerida_codigo: regRes.nota.mesa_sugerida_codigo,
        es_mostrador: regRes.nota.es_mostrador
      },
      items: regRes.items
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 4. LISTADO Y DETALLE DE NOTAS EN DEPÓSITO
// ============================================================
router.get('/notas', async (req, res) => {
  try {
    const { estado, mesa, separadorId } = req.query;
    let sql = 'SELECT * FROM tbl_notas_deposito WHERE 1=1';
    const params = [];

    if (estado) {
      sql += ' AND estado = ?';
      params.push(estado);
    }
    if (mesa) {
      sql += ' AND mesa_codigo = ?';
      params.push(mesa);
    }
    if (separadorId) {
      sql += ' AND separador_id = ?';
      params.push(separadorId);
    }

    sql += ` ORDER BY 
      es_mostrador DESC,
      CASE estado 
        WHEN 'SEPARANDO' THEN 1
        WHEN 'ESPERA_CONFIRMACION' THEN 2
        WHEN 'PENDIENTE' THEN 3
        WHEN 'ASIGNADO_MESA' THEN 4
        WHEN 'EN_MESA' THEN 5
        ELSE 6 
      END, 
      fecha_ingreso DESC`;

    const [notas] = await pool.query(sql, params);

    const formatted = notas.map(n => ({
      ...n,
      tiempo_separacion_fmt: formatearSegundos(n.tiempo_neto_separacion_seg),
      tiempo_mesa_fmt: formatearSegundos(n.tiempo_neto_mesa_seg),
      tiempo_total_fmt: formatearSegundos(n.tiempo_total_ciclo_seg),
      tiempo_espera_confirmacion_fmt: formatearSegundos(n.tiempo_espera_confirmacion_seg)
    }));

    res.json({ success: true, notas: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/notas/:id', async (req, res) => {
  try {
    const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [req.params.id]);
    if (!nota) return res.status(404).json({ success: false, error: 'Nota no encontrada en depósito' });

    const [items] = await pool.query('SELECT * FROM tbl_nota_items WHERE nota_id = ? ORDER BY num_item ASC', [req.params.id]);
    const [bips] = await pool.query('SELECT * FROM tbl_bips_log WHERE nota_id = ? ORDER BY id DESC LIMIT 50', [req.params.id]);
    const [historial] = await pool.query('SELECT * FROM tbl_estados_historial WHERE nota_id = ? ORDER BY id ASC', [req.params.id]);

    res.json({
      success: true,
      nota: {
        ...nota,
        tiempo_separacion_fmt: formatearSegundos(nota.tiempo_neto_separacion_seg),
        tiempo_mesa_fmt: formatearSegundos(nota.tiempo_neto_mesa_seg),
        tiempo_total_fmt: formatearSegundos(nota.tiempo_total_ciclo_seg),
        tiempo_espera_confirmacion_fmt: formatearSegundos(nota.tiempo_espera_confirmacion_seg)
      },
      items,
      bips,
      historial
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Asignar separador a una nota (El reloj de picking arranca de inmediato)
router.post('/notas/:id/asignar-separador', async (req, res) => {
  try {
    const { separadorId } = req.body;
    const result = await asignarSeparadorANota(req.params.id, separadorId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Asignar mesa de destino a una nota (Control del Supervisor)
router.post('/notas/:id/asignar-mesa', async (req, res) => {
  try {
    const { mesaCodigo } = req.body;
    if (!mesaCodigo) return res.status(400).json({ success: false, error: 'mesaCodigo es requerido' });

    const [[mesa]] = await pool.query('SELECT * FROM tbl_mesas WHERE codigo = ?', [mesaCodigo]);
    if (!mesa) return res.status(404).json({ success: false, error: `Mesa ${mesaCodigo} no existe` });

    await pool.query(
      'UPDATE tbl_notas_deposito SET mesa_id = ?, mesa_codigo = ? WHERE id = ?',
      [mesa.id, mesaCodigo, req.params.id]
    );

    res.json({
      success: true,
      message: `Nota asignada a Mesa ${mesaCodigo}`,
      mesaCodigo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Alternar marca de Mostrador / Retiro Local (Prioridad Absoluta)
router.post('/notas/:id/toggle-mostrador', async (req, res) => {
  try {
    const [[nota]] = await pool.query('SELECT id, es_mostrador FROM tbl_notas_deposito WHERE id = ?', [req.params.id]);
    if (!nota) return res.status(404).json({ success: false, error: 'Nota no encontrada' });

    const nuevoValor = (nota.es_mostrador === 1) ? 0 : 1;
    await pool.query('UPDATE tbl_notas_deposito SET es_mostrador = ? WHERE id = ?', [nuevoValor, req.params.id]);

    res.json({
      success: true,
      es_mostrador: nuevoValor === 1,
      message: nuevoValor === 1 ? 'Marcada como retiro en MOSTRADOR (Prioridad Alta)' : 'Marcada como envío estándar'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 5. OPERACIONES DE PICKING Y BIPS LÁSER
// ============================================================
router.post('/picking/iniciar', async (req, res) => {
  try {
    const { notaId, operarioId } = req.body;
    if (!notaId || !operarioId) {
      return res.status(400).json({ success: false, error: 'Parámetros notaId y operarioId son requeridos' });
    }

    const result = await iniciarPicking(notaId, operarioId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/picking/bip', async (req, res) => {
  try {
    const { notaId, operarioId, barcode } = req.body;
    if (!notaId || !barcode) {
      return res.status(400).json({ success: false, error: 'notaId y barcode son requeridos' });
    }

    const resultado = await registrarBip(notaId, operarioId, barcode);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/picking/finalizar', async (req, res) => {
  try {
    const { notaId, operarioId, mesaSugeridaCodigo, mesaCodigo } = req.body;
    const destinoMesa = mesaSugeridaCodigo || mesaCodigo;

    if (!notaId || !destinoMesa) {
      return res.status(400).json({ success: false, error: 'Falta mesa sugerida de entrega' });
    }

    const [[nota]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
    if (!nota) return res.status(404).json({ success: false, error: 'Nota no encontrada' });

    // Obtener pausas registradas durante el picking
    const pausas = await getPausasRegistradas(nota.inicio_separacion);

    // Cálculo exacto del tiempo neto descontando noche, café, almuerzo y pausas
    const tiempoNetoSeg = calcularTiempoNeto(nota.inicio_separacion || new Date(), new Date(), pausas, {
      permiteHoraExtra: nota.permite_hora_extra === 1
    });

    const result = await finalizarPickingYSugerirMesa(notaId, operarioId, destinoMesa, tiempoNetoSeg);

    res.json({
      success: true,
      message: `Nota entregada a espera de confirmación para Mesa ${destinoMesa}`,
      estado: result.estado,
      mesaSugerida: destinoMesa,
      tiempoNetoSeg,
      tiempoNetoFmt: formatearSegundos(tiempoNetoSeg)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 6. CONTROL Y CONFIRMACIÓN DEL SUPERVISOR
// ============================================================

// Autenticación de Supervisor por PIN
async function handleSupervisorLogin(req, res) {
  try {
    const { pin, codigo, usuario, operarioId } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: 'PIN es requerido' });

    const ident = (codigo || usuario || '').trim();

    let query = 'SELECT id, codigo, nombre, rol, mesa_codigo, permisos_custom FROM tbl_operarios WHERE pin = ? AND activo = 1';
    const params = [pin];

    if (ident) {
      query += ' AND (codigo = ? OR nombre = ? OR nombre LIKE ?)';
      params.push(ident, ident, `%${ident}%`);
    } else if (operarioId) {
      query += ' AND id = ?';
      params.push(operarioId);
    }

    const [rows] = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas o usuario inactivo' });
    }

    const user = rows[0];
    let perms = user.permisos_custom;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch (_) { perms = null; }
    }

    res.json({
      success: true,
      supervisor: {
        ...user,
        permisos_custom: perms
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

router.post('/supervisor/login', handleSupervisorLogin);
router.post('/supervisor.php', handleSupervisorLogin);

// Confirmar o Reasignar mesa para nota en ESPERA_CONFIRMACION
router.post('/supervisor/confirmar-mesa', async (req, res) => {
  try {
    const { notaId, supervisorId, mesaCodigo } = req.body;
    if (!notaId || !mesaCodigo) {
      return res.status(400).json({ success: false, error: 'notaId y mesaCodigo son requeridos' });
    }

    const result = await confirmarMesaSupervisor(notaId, supervisorId, mesaCodigo);
    res.json({
      success: true,
      message: `Nota confirmada y en cola de Mesa ${mesaCodigo}`,
      ...result,
      tiempoEsperaFmt: formatearSegundos(result.tiempoEsperaSeg)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Estado en tiempo real del depósito para el Supervisor
router.get('/supervisor/estado-general', async (req, res) => {
  try {
    const estado = await getSupervisionEstadoGeneral();
    res.json({ success: true, ...estado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Habilitar o Deshabilitar Hora Extra para un separador o nota
router.post('/supervisor/hora-extra', async (req, res) => {
  try {
    const { separadorId, notaId, permiteHoraExtra } = req.body;
    const flag = permiteHoraExtra ? 1 : 0;

    if (notaId) {
      await pool.query('UPDATE tbl_notas_deposito SET permite_hora_extra = ? WHERE id = ?', [flag, notaId]);
    } else if (separadorId) {
      await pool.query(
        'UPDATE tbl_notas_deposito SET permite_hora_extra = ? WHERE separador_id = ? AND estado = "SEPARANDO"',
        [flag, separadorId]
      );
    } else {
      return res.status(400).json({ success: false, error: 'Se requiere separadorId o notaId' });
    }

    res.json({
      success: true,
      permiteHoraExtra: flag === 1,
      message: flag === 1 ? 'Hora extra habilitada' : 'Hora extra deshabilitada (pausa a las 17:00)'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 7. REPORTES Y KPIS MENSUALES DE PRODUCTIVIDAD
// ============================================================
const { 
  getReporteSeparadores, 
  getReporteGuardadores, 
  generarCsv 
} = require('../repositories/reportRepository');

router.get('/reportes/separadores', async (req, res) => {
  try {
    const { mes } = req.query; // YYYY-MM
    const reporte = await getReporteSeparadores(mes);
    res.json({ success: true, mes: mes || 'TODOS', reporte });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reportes/guardadores', async (req, res) => {
  try {
    const { mes } = req.query; // YYYY-MM
    const reporte = await getReporteGuardadores(mes);
    res.json({ success: true, mes: mes || 'TODOS', reporte });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reportes/exportar/csv', async (req, res) => {
  try {
    const { tipo = 'separadores', mes } = req.query;
    let datos = [];

    if (tipo === 'separadores') {
      datos = await getReporteSeparadores(mes);
    } else {
      datos = await getReporteGuardadores(mes);
    }

    const csvContent = generarCsv(tipo, datos, mes);
    const fileName = `Reporte_${tipo}_${mes || 'historico'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 10. GESTIÓN DE DISCREPANCIAS Y FALTANTES (FASE 8)
// LECTURA PURA FIREBIRD ERP (SELECT) + GESTIÓN MYSQL
// ============================================================

/**
 * Reportar faltante de ítem durante el picking (Botón "No Hay").
 * Consulta Firebird en modo solo lectura (SELECT) y registra en MySQL.
 * El reloj de picking continúa activo sin interrupción.
 */
router.post('/picking/reportar-faltante', async (req, res) => {
  try {
    const { notaId, itemId, operarioId, motivo } = req.body;
    if (!notaId || !itemId || !operarioId) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: notaId, itemId, operarioId' });
    }

    const resultado = await reportarFaltante(notaId, itemId, operarioId, motivo);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Listar discrepancias de stock (Filtros: estado, notaId, soloPendientes).
 */
router.get('/discrepancias', async (req, res) => {
  try {
    const discrepancias = await getDiscrepancias(req.query);
    res.json({ success: true, discrepancias });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Reporte de faltantes recurrentes en la última semana (3+ faltantes).
 * Usado por el Supervisor Maestro (Marcos) y alertas de inventario.
 */
router.get('/discrepancias/recurrentes-semana', async (req, res) => {
  try {
    const recurrentes = await getDiscrepanciasRecurrentesSemana();
    res.json({ success: true, total: recurrentes.length, recurrentes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Resolver discrepancia por parte del supervisor.
 * Acciones: CONFIRMAR_FALTANTE (habilita cierre parcial) | HALLADO_EN_DEPOSITO (restaura para bipado)
 */
router.post('/discrepancias/:id/resolver', async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId, accion, comentario, nuevaUbicacion } = req.body;
    if (!supervisorId || !accion) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos: supervisorId, accion' });
    }

    const resultado = await resolverDiscrepancia(id, supervisorId, { accion, comentario, nuevaUbicacion });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
