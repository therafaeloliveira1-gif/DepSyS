const pool = require('../src/config/db');
const {
  registrarNotaDesdeFirebird,
  asignarSeparadorANota,
  iniciarPicking,
  reportarFaltante,
  getDiscrepancias,
  resolverDiscrepancia,
  getDiscrepanciasRecurrentesSemana,
  finalizarPickingYSugerirMesa
} = require('../src/repositories/depositRepository');
const { getPedidoReal } = require('../src/services/orderService');
const { consultarStockTeoricoFirebird } = require('../src/adapters/firebirdStockAdapter');

async function runDiscrepanciasTest() {
  console.log('============================================================');
  console.log('🧪 TEST AUTOMATIZADO - FASE 8: FALTANTES Y DISCREPANCIAS DE STOCK');
  console.log('🛡️ REGLA: Firebird ERP es 100% SOLO LECTURA (SELECT puro).');
  console.log('   Toda mutación ocurre exclusivamente en MySQL (mendes_db).');
  console.log('============================================================\n');

  try {
    // 1. Probar adapter de Firebird en modo solo lectura
    console.log('1️⃣ Probando consulta SELECT en Firebird para SKU 3019...');
    const fbStock = await consultarStockTeoricoFirebird('3019');
    console.log(`   Resultado Firebird:`, {
      codprod: fbStock.codprod,
      descricao: fbStock.descricao,
      stock_fisico: fbStock.stock_fisico,
      ubicacion: fbStock.ubicacion_estante
    });
    if (!fbStock.success || fbStock.stock_fisico <= 0) {
      throw new Error('Fallo al consultar stock teórico en Firebird');
    }
    console.log('   ✅ Firebird respondió con SELECT sin modificar nada.\n');

    // 2. Registrar nota de prueba en MySQL
    console.log('2️⃣ Registrando nota 38002 para prueba de faltantes...');
    const fbRes = await getPedidoReal('38002');
    if (!fbRes.success) throw new Error('Error al obtener pedido 38002: ' + fbRes.error);
    const regRes = await registrarNotaDesdeFirebird(fbRes.pedido);
    const notaId = regRes.nota ? regRes.nota.id : regRes.notaId;
    console.log(`   Nota ID sincronizada: ${notaId}`);

    // Limpiar discrepancias previas de prueba para este test
    await pool.query('DELETE FROM tbl_discrepancias_stock WHERE nota_id = ?', [notaId]);
    await pool.query('UPDATE tbl_nota_items SET es_faltante = 0, faltante_aprobado = 0 WHERE nota_id = ?', [notaId]);
    await pool.query('UPDATE tbl_notas_deposito SET total_faltantes = 0, cierre_parcial = 0 WHERE id = ?', [notaId]);

    // Obtener separador y supervisor activos
    const [[separador]] = await pool.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'SEPARADOR' AND activo = 1 LIMIT 1");
    const [[supervisor]] = await pool.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'SUPERVISOR' AND activo = 1 LIMIT 1");
    console.log(`   Usando Separador: ${separador.nombre} (${separador.codigo}, ID ${separador.id})`);
    console.log(`   Usando Supervisor: ${supervisor.nombre} (${supervisor.codigo}, ID ${supervisor.id})\n`);

    // Asignar separador
    await asignarSeparadorANota(notaId, separador.id);
    await iniciarPicking(notaId, separador.id);
    console.log('   ✅ Nota asignada y en picking activo.\n');

    // Obtener los ítems de la nota
    const [items] = await pool.query('SELECT * FROM tbl_nota_items WHERE nota_id = ?', [notaId]);
    console.log(`   Ítems en la nota: ${items.length}`);
    const itemAFaltar = items[0];
    console.log(`   Ítem seleccionado para reporte de faltante: [${itemAFaltar.sku}] ${itemAFaltar.descripcion}`);

    // 3. Separador reporta faltante (Botón "No Hay")
    console.log('\n3️⃣ Separador presiona "No Hay" sobre el ítem...');
    const faltanteRes = await reportarFaltante(notaId, itemAFaltar.id, separador.id, 'No se encuentra en el pasillo asignado');
    console.log('   Respuesta de reportarFaltante:', faltanteRes);
    if (!faltanteRes.success || !faltanteRes.discrepanciaId) {
      throw new Error('Error al registrar faltante');
    }
    console.log(`   ✅ Discrepancia ID ${faltanteRes.discrepanciaId} registrada en MySQL.`);
    console.log(`   Stock teórico Firebird detectado: ${faltanteRes.stockTeoricoFirebird} unidades.`);
    console.log(`   Requiere verificación física del supervisor: ${faltanteRes.requiereVerificacionFisica ? 'SÍ (ALERTA URGENTE)' : 'NO'}`);

    // Verificar que el ítem quedó marcado como faltante en MySQL
    const [[itemActualizado]] = await pool.query('SELECT * FROM tbl_nota_items WHERE id = ?', [itemAFaltar.id]);
    if (itemActualizado.es_faltante !== 1) {
      throw new Error('El ítem no quedó marcado con es_faltante = 1');
    }
    console.log('   ✅ tbl_nota_items.es_faltante = 1 verificado.');

    // 4. Supervisor lista discrepancias pendientes
    console.log('\n4️⃣ Supervisor consulta lista de discrepancias...');
    const discrepancias = await getDiscrepancias({ soloPendientes: true, notaId });
    console.log(`   Discrepancias pendientes para la nota: ${discrepancias.length}`);
    if (discrepancias.length === 0) {
      throw new Error('La discrepancia no aparece en la lista de pendientes');
    }
    console.log(`   Discrepancia encontrada: ${discrepancias[0].descripcion} - Estado: ${discrepancias[0].estado}`);

    // 5. Supervisor resuelve la discrepancia confirmando el faltante
    console.log(`\n5️⃣ Supervisor confirma el faltante físico (${supervisor.codigo}: ${supervisor.nombre})...`);
    const resolRes = await resolverDiscrepancia(faltanteRes.discrepanciaId, supervisor.id, {
      accion: 'CONFIRMAR_FALTANTE',
      comentario: 'Verificado físicamente en estante. Efectivamente no hay stock físico disponible.'
    });
    console.log('   Respuesta de resolución:', resolRes);

    // Verificar actualización en MySQL
    const [[notaVerif]] = await pool.query('SELECT * FROM tbl_notas_deposito WHERE id = ?', [notaId]);
    console.log(`   Estado nota tras resolución: total_faltantes=${notaVerif.total_faltantes}, cierre_parcial=${notaVerif.cierre_parcial}`);
    if (notaVerif.cierre_parcial !== 1 || notaVerif.total_faltantes < 1) {
      throw new Error('No se actualizó cierre_parcial o total_faltantes en la nota');
    }
    console.log('   ✅ Cierre parcial y total de faltantes validados correctamente.');

    // 6. Finalizar picking y sugerir mesa
    console.log('\n6️⃣ Finalizando picking con cierre parcial...');
    const finRes = await finalizarPickingYSugerirMesa(notaId, separador.id, '301', 420);
    console.log('   Resultado finalizar picking:', finRes);
    if (finRes.estado !== 'ESPERA_CONFIRMACION' || !finRes.cierreParcial) {
      throw new Error('Error al finalizar picking con faltante');
    }
    console.log('   ✅ Nota pasó a ESPERA_CONFIRMACION con cierre parcial reconocido.');

    // 7. Simular 2 reportes adicionales del mismo SKU para verificar alerta de recurrencia (>= 3 en la semana)
    console.log('\n7️⃣ Simulando discrepancias recurrentes (3 o más en la semana) para SKU:', itemAFaltar.sku);
    await pool.query(`
      INSERT INTO tbl_discrepancias_stock (
        nota_id, num_pedido, sku, codigo_barra, descripcion,
        cantidad_requerida, stock_teorico_firebird, separador_id, separador_nombre, estado, resolucion
      ) VALUES 
      (?, '38002-TEST1', ?, 'BAR1', ?, 1, 10, 1, 'Lucas Silva', 'CONFIRMADO_FALTANTE', 'Faltante 2'),
      (?, '38002-TEST2', ?, 'BAR2', ?, 1, 10, 1, 'Lucas Silva', 'CONFIRMADO_FALTANTE', 'Faltante 3')
    `, [notaId, itemAFaltar.sku, itemAFaltar.descripcion, notaId, itemAFaltar.sku, itemAFaltar.descripcion]);

    const recurrentes = await getDiscrepanciasRecurrentesSemana();
    console.log(`   Reportes de discrepancias recurrentes detectados: ${recurrentes.length}`);
    const recurrenteItem = recurrentes.find(r => r.sku === itemAFaltar.sku);
    if (!recurrenteItem || recurrenteItem.total_reportes_semana < 3) {
      throw new Error('Fallo en la detección de discrepancias recurrentes');
    }
    console.log(`   🚨 Alerta recurrente confirmada para SKU ${recurrenteItem.sku}: ${recurrenteItem.total_reportes_semana} faltantes esta semana.`);

    console.log('\n============================================================');
    console.log('🎉 TODOS LOS TESTS DE FASE 8 PASARON EXITOSAMENTE');
    console.log('🛡️ Cero escrituras a Firebird. 100% operaciones MySQL.');
    console.log('============================================================');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR EN EL TEST DE FASE 8:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runDiscrepanciasTest();
