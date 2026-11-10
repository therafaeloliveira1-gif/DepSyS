const { initDatabase } = require('../src/repositories/depositRepository');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('../src/routes/apiRoutes');

async function testSupervisorPause() {
  console.log('===============================================================');
  console.log('🧪 TEST: Botón Maestro de Pausa Global (Plan 04-01)');
  console.log('===============================================================\n');

  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(3011, async () => {
    try {
      // 1. Estado inicial
      console.log('🔹 1. Consultando estado inicial de depósito...');
      const s1 = await fetch('http://localhost:3011/api/status').then(r => r.json());
      console.log(`   - Pausa global activa: ${s1.pausaGlobal}`);

      // 2. Activar Pausa Maestra (si no estaba activa)
      console.log('\n🔹 2. Accionando botón maestro del supervisor (Toggle)...');
      const toggle1 = await fetch('http://localhost:3011/api/pausa/toggle-global', { method: 'POST' }).then(r => r.json());
      console.log(`   - Resultado: ${toggle1.estado} -> ${toggle1.message}`);

      // 3. Verificar status
      const s2 = await fetch('http://localhost:3011/api/status').then(r => r.json());
      console.log(`   - Nuevo estado en /api/status: pausaGlobal = ${s2.pausaGlobal}`);

      // 4. Restaurar a estado operativo
      if (s2.pausaGlobal) {
        console.log('\n🔹 4. Reanudando jornada de depósito...');
        const toggle2 = await fetch('http://localhost:3011/api/pausa/toggle-global', { method: 'POST' }).then(r => r.json());
        console.log(`   - Resultado: ${toggle2.estado} -> ${toggle2.message}`);
        const s3 = await fetch('http://localhost:3011/api/status').then(r => r.json());
        console.log(`   - Estado final: pausaGlobal = ${s3.pausaGlobal}`);
      }

      console.log('\n===============================================================');
      console.log('🎉 ¡TEST DE CONTROL MAESTRO DE SUPERVISOR PASÓ CON ÉXITO!');
      console.log('===============================================================');
    } catch (err) {
      console.error('❌ Error en test de pausa:', err);
      process.exitCode = 1;
    } finally {
      const pool = require('../src/config/db');
      await pool.end();
      server.close();
    }
  });
}

testSupervisorPause();
