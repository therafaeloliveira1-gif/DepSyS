const http = require('http');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('../src/routes/apiRoutes');
const { initDatabase } = require('../src/repositories/depositRepository');

async function testApiServer() {
  console.log('🧪 Iniciando prueba de integración de DepSystem API...');

  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(3009, async () => {
    console.log('🚀 Servidor de prueba escuchando en puerto 3009');

    try {
      // 1. Test /api/status
      console.log('\n--- 1. Probando GET /api/status ---');
      const resStatus = await fetch('http://localhost:3009/api/status').then(r => r.json());
      console.log('Respuesta status:', resStatus);
      if (!resStatus.success) throw new Error('Status endpoint falló');

      // 2. Test /api/mesas
      console.log('\n--- 2. Probando GET /api/mesas ---');
      const resMesas = await fetch('http://localhost:3009/api/mesas').then(r => r.json());
      console.log(`Mesas encontradas: ${resMesas.mesas.length}`);
      resMesas.mesas.forEach(m => console.log(` - Mesa ${m.codigo}: ${m.nombre} (Estado: ${m.estado})`));

      // 3. Test /api/operarios
      console.log('\n--- 3. Probando GET /api/operarios ---');
      const resOperarios = await fetch('http://localhost:3009/api/operarios').then(r => r.json());
      console.log(`Operarios encontrados: ${resOperarios.operarios.length}`);

      // 4. Test /api/pedidos/38002 (Firebird real)
      console.log('\n--- 4. Probando GET /api/pedidos/38002 (Firebird ERP) ---');
      const resPedido = await fetch('http://localhost:3009/api/pedidos/38002').then(r => r.json());
      if (!resPedido.success) throw new Error('Consulta de pedido real Firebird falló: ' + JSON.stringify(resPedido));
      
      console.log(`✅ Pedido #${resPedido.pedido.num_pedido} obtenido con éxito`);
      console.log(`   Cliente: ${resPedido.pedido.cliente_nombre}`);
      console.log(`   Items sincronizados en DepSystem: ${resPedido.items.length}`);
      console.log(`   Estado depósito: ${resPedido.pedido.estado_deposito}`);

      // 5. Test /api/mesas/301/cola
      console.log('\n--- 5. Probando GET /api/mesas/301/cola ---');
      const resCola = await fetch('http://localhost:3009/api/mesas/301/cola').then(r => r.json());
      if (!resCola.success) throw new Error('Endpoint /api/mesas/301/cola falló');
      console.log(`✅ Cola de Mesa 301 obtenida: ${resCola.notas.length} notas en espera`);

      // 6. Test /api/discrepancias
      console.log('\n--- 6. Probando GET /api/discrepancias ---');
      const resDisc = await fetch('http://localhost:3009/api/discrepancias').then(r => r.json());
      if (!resDisc.success) throw new Error('Endpoint /api/discrepancias falló');
      console.log(`✅ Discrepancias encontradas: ${resDisc.discrepancias.length}`);

      // 7. Test /api/discrepancias/recurrentes-semana
      console.log('\n--- 7. Probando GET /api/discrepancias/recurrentes-semana ---');
      const resRec = await fetch('http://localhost:3009/api/discrepancias/recurrentes-semana').then(r => r.json());
      if (!resRec.success) throw new Error('Endpoint /api/discrepancias/recurrentes-semana falló');
      console.log(`✅ Discrepancias recurrentes detectadas: ${resRec.total}`);

      console.log('\n🎉 ¡TODAS LAS PRUEBAS DE INTEGRACIÓN DE LA API PASARON EXITOSAMENTE!');
    } catch (err) {
      console.error('❌ Error en prueba de integración:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      process.exit(process.exitCode || 0);
    }
  });
}

testApiServer();
