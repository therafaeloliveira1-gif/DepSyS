const http = require('http');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('../src/routes/apiRoutes');
const { initDatabase } = require('../src/repositories/depositRepository');

async function testFullLifecycle() {
  console.log('===============================================================');
  console.log('🧪 TEST E2E: Ciclo Completo de DepSystem (Planes 01, 02 y 03)');
  console.log('===============================================================\n');

  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(3010, async () => {
    try {
      // 1. Obtener operarios
      console.log('🔹 1. Obteniendo separador y guardador...');
      const ops = await fetch('http://localhost:3010/api/operarios').then(r => r.json());
      const separador = ops.operarios.find(o => o.rol === 'SEPARADOR');
      const guardador = ops.operarios.find(o => o.rol === 'GUARDADOR');
      console.log(`   - Separador: ${separador.nombre} (ID: ${separador.id})`);
      console.log(`   - Guardador: ${guardador.nombre} (ID: ${guardador.id})`);

      // 2. Consultar pedido real Firebird 38002
      console.log('\n🔹 2. Consultando y sincronizando Pedido Firebird 38002...');
      const resPedido = await fetch('http://localhost:3010/api/pedidos/38002').then(r => r.json());
      const notaId = resPedido.pedido.id_deposito;
      console.log(`   - Nota Depósito ID: ${notaId}`);
      console.log(`   - Total Repuestos: ${resPedido.items.length}`);
      console.log(`   - Total Piezas Físicas: ${resPedido.pedido.total_piezas}`);

      // 3. Iniciar Picking
      console.log('\n🔹 3. Iniciando picking...');
      const resInicioPick = await fetch('http://localhost:3010/api/picking/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId: separador.id })
      }).then(r => r.json());
      console.log(`   - Estado picking: ${resInicioPick.message}`);

      // 4. Simular bipeo de un repuesto real
      const repuestoPendiente = resPedido.items.find(it => it.sku === '6243');
      console.log(`\n🔹 4. Simulando bipeo láser del repuesto SKU: ${repuestoPendiente.sku} (Cant: ${repuestoPendiente.cantidad_requerida})...`);
      const resBip = await fetch('http://localhost:3010/api/picking/bip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId: separador.id, barcode: repuestoPendiente.sku })
      }).then(r => r.json());
      console.log(`   - Bip válido: ${resBip.esValido} (Cantidad bipada: ${resBip.item?.cantidad_bipada}/${resBip.item?.cantidad_requerida})`);

      console.log('\n🔹 5. Finalizando picking y sugiriendo Mesa 301...');
      const resEntrega = await fetch('http://localhost:3010/api/picking/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId: separador.id, mesaSugeridaCodigo: '301' })
      }).then(r => r.json());
      console.log(`   - Entrega: ${resEntrega.message}`);
      console.log(`   - Tiempo Neto Separación: ${resEntrega.tiempoNetoFmt} (${resEntrega.tiempoNetoSeg}s)`);

      // 5.b Supervisor confirma la mesa sugerida
      console.log('\n🔹 5.b Supervisor Nelson confirma Mesa 301...');
      const resConf = await fetch('http://localhost:3010/api/supervisor/confirmar-mesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, supervisorId: 5, mesaCodigo: '301' })
      }).then(r => r.json());
      console.log(`   - Confirmación: ${resConf.message}`);

      // 6. Consultar cola de Mesa 301
      console.log('\n🔹 6. Consultando cola de Mesa 301 en App-Mesa...');
      const resColaMesa = await fetch('http://localhost:3010/api/mesas/301/cola').then(r => r.json());
      console.log(`   - Notas en cola de Mesa 301: ${resColaMesa.notas.length}`);
      const notaEnCola = resColaMesa.notas.find(n => n.id === notaId);
      if (!notaEnCola) throw new Error('La nota no apareció en la cola de Mesa 301');
      console.log(`   - Nota #${notaEnCola.num_pedido} encontrada con estado: ${notaEnCola.estado}`);

      // 7. Iniciar Revisión en Mesa 301
      console.log('\n🔹 7. Guardador inicia revisión en Mesa 301...');
      const resInicioMesa = await fetch('http://localhost:3010/api/mesa/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, guardadorId: guardador.id })
      }).then(r => r.json());
      console.log(`   - Estado revisión mesa: ${resInicioMesa.message}`);

      // 8. Finalizar Revisión en Mesa y Despachar
      console.log('\n🔹 8. Guardador finaliza revisión y empaque...');
      const resFinMesa = await fetch('http://localhost:3010/api/mesa/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, guardadorId: guardador.id })
      }).then(r => r.json());
      console.log(`   - Resultado: ${resFinMesa.message}`);
      console.log(`   - Tiempo Neto Mesa: ${resFinMesa.tiempoNetoMesaFmt}`);
      console.log(`   - Tiempo Total de Ciclo (Picking + Mesa): ${resFinMesa.tiempoTotalCicloFmt}`);

      // 9. Verificar estado final
      const resFinal = await fetch(`http://localhost:3010/api/notas/${notaId}`).then(r => r.json());
      console.log(`\n🔹 9. Verificación de Nota Finalizada:`);
      console.log(`   - Estado: ${resFinal.nota.estado}`);
      console.log(`   - Separador: ${resFinal.nota.separador_nombre}`);
      console.log(`   - Guardador: ${resFinal.nota.guardador_nombre}`);
      console.log(`   - Mesa: ${resFinal.nota.mesa_codigo}`);

      console.log('\n===============================================================');
      console.log('🎉 ¡TODO EL FLUJO E2E DE PICKING Y MESA COMPLETADO CON ÉXITO!');
      console.log('===============================================================');
    } catch (err) {
      console.error('❌ Error en prueba E2E:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      process.exit(process.exitCode || 0);
    }
  });
}

testFullLifecycle();
