const pool = require('../src/config/db');
const { initDatabase, getOperarios, getMesas, registrarNotaDesdeFirebird, registrarBip } = require('../src/repositories/depositRepository');
const { getPedidoReal } = require('../src/services/orderService');

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 TEST: Persistencia MySQL mendes_db & Repositorio (Plan 01-02)');
  console.log('===============================================================\n');

  try {
    // 1. Inicializar Tablas
    console.log('🔹 1. Inicializando tablas en mendes_db...');
    const initRes = await initDatabase();
    console.log('✅', initRes.message);

    // 2. Verificar que las 7 tablas existen
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(r => Object.values(r)[0]);
    console.log(`✅ Tablas verificadas (${tableNames.length}):`, tableNames);

    const requiredTables = [
      'tbl_operarios', 'tbl_mesas', 'tbl_notas_deposito',
      'tbl_nota_items', 'tbl_bips_log', 'tbl_pausas_jornada', 'tbl_configuracion'
    ];
    for (const req of requiredTables) {
      if (!tableNames.includes(req)) {
        console.error(`❌ Falta la tabla requerida: ${req}`);
        process.exit(1);
      }
    }

    // 3. Verificar Mesas
    const mesas = await getMesas();
    console.log(`✅ Mesas verificadas (${mesas.length}):`, mesas.map(m => `Mesa ${m.codigo} (${m.nombre})`));
    if (mesas.length < 4) {
      console.error('❌ Error: Se esperaban al menos 4 mesas (301-304).');
      process.exit(1);
    }

    // 4. Verificar Operarios
    const operarios = await getOperarios();
    console.log(`✅ Operarios verificados (${operarios.length}):`, operarios.map(o => `${o.nombre} [${o.rol}]`));
    if (operarios.length < 3) {
      console.error('❌ Error: Se esperaban al menos 3 operarios.');
      process.exit(1);
    }

    // 5. Integración: Cargar pedido real 38002 de Firebird a MySQL
    console.log('\n🔹 5. Cargando pedido real 38002 de Firebird en MySQL...');
    const orderRes = await getPedidoReal('38002');
    if (!orderRes.success) {
      console.error('❌ Error obteniendo pedido de Firebird:', orderRes.error);
      process.exit(1);
    }

    const regRes = await registrarNotaDesdeFirebird(orderRes.pedido);
    console.log(`✅ Pedido guardado en MySQL con ID: ${regRes.nota.id}`);
    console.log(`   - Número de Pedido: ${regRes.nota.num_pedido}`);
    console.log(`   - Ítems guardados en tbl_nota_items: ${regRes.items.length}`);
    if (regRes.items.length !== 21) {
      console.error('❌ Error: Debían guardarse 21 ítems.');
      process.exit(1);
    }

    // 6. Probar Bip láser válido
    console.log('\n🔹 6. Simulando escaneo láser correcto (SKU: 3019 - Asiento Biz)...');
    const bipValido = await registrarBip(regRes.nota.id, operarios[0].id, '3019');
    console.log('✅ Resultado bip válido:', bipValido.message || bipValido.item.descripcion, `(${bipValido.item.cantidad_bipada}/${bipValido.item.cantidad_requerida})`);
    if (!bipValido.esValido) {
      console.error('❌ Error: El bip debió ser válido.');
      process.exit(1);
    }

    // 7. Probar Bip láser inválido
    console.log('\n🔹 7. Simulando escaneo láser incorrecto (Código inexistente: 99999)...');
    const bipInvalido = await registrarBip(regRes.nota.id, operarios[0].id, '99999');
    console.log(`✅ Detección de error validada: "${bipInvalido.message}"`);
    if (bipInvalido.esValido) {
      console.error('❌ Error: El bip debió ser rechazado.');
      process.exit(1);
    }

    // 8. Verificar registro en auditoría tbl_bips_log
    const [bipsLog] = await pool.query('SELECT * FROM tbl_bips_log WHERE nota_id = ? ORDER BY id DESC', [regRes.nota.id]);
    console.log(`✅ Auditoría de bips verificada: ${bipsLog.length} registros guardados en tbl_bips_log`);

    console.log('\n===============================================================');
    console.log('🎉 TODOS LOS TESTS DE PERSISTENCIA MYSQL PASARON CON ÉXITO');
    console.log('===============================================================');

  } catch (err) {
    console.error('❌ Error en test_mysql:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
