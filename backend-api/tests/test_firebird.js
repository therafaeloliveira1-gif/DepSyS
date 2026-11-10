const { getPedidoReal } = require('../src/services/orderService');

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 TEST: Adaptador Firebird Real SGLoja (Plan 01-01)');
  console.log('===============================================================\n');

  // Test 1: Consultar pedido real 38002
  console.log('🔹 Test 1: Consultando pedido real N° 38002...');
  const t0 = Date.now();
  const res = await getPedidoReal('38002');
  const elapsed = Date.now() - t0;

  if (!res.success) {
    console.error('❌ FALLÓ Test 1:', res.error);
    process.exit(1);
  }

  const p = res.pedido;
  console.log(`✅ Pedido 38002 obtenido en ${elapsed}ms:`);
  console.log(`   - Cliente: ${p.cliente_nombre} (Cod: ${p.cliente_codigo})`);
  console.log(`   - Ciudad: ${p.cliente_ciudad}`);
  console.log(`   - Total Repuestos (Ítems): ${p.total_items}`);
  console.log(`   - Total Piezas Físicas: ${p.total_piezas}`);
  console.log(`   - Monto Total: Gs. ${p.valor_total.toLocaleString('es-PY')}`);

  // Validaciones estrictas
  if (!p.cliente_nombre.includes('TALLER DE MOTOS Y VENTAS DE REPUESTOS M.R')) {
    console.error('❌ Error: El nombre del cliente no coincide.');
    process.exit(1);
  }

  if (p.items.length !== 21) {
    console.error(`❌ Error: Se esperaban 21 ítems, se obtuvieron ${p.items.length}`);
    process.exit(1);
  }

  console.log('\n   Primeros 3 repuestos para picking:');
  p.items.slice(0, 3).forEach(it => {
    console.log(`     [SKU: ${it.sku}] ${it.descripcion} - Cant: ${it.cantidad_requerida}`);
  });

  // Test 2: Consultar pedido inexistente
  console.log('\n🔹 Test 2: Consultando pedido inexistente (999999999)...');
  const resInvalido = await getPedidoReal('999999999');
  if (resInvalido.success) {
    console.error('❌ Error: El pedido inexistente no debió retornar éxito.');
    process.exit(1);
  }
  console.log(`✅ Manejo de error verificado: "${resInvalido.error}"`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS LOS TESTS DE FIREBIRD PASARON EXITOSAMENTE (100% DATOS REALES)');
  console.log('===============================================================');
}

runTests();
