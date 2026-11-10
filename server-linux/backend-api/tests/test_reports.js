const express = require('express');
const cors = require('cors');
const apiRoutes = require('../src/routes/apiRoutes');
const { initDatabase } = require('../src/repositories/depositRepository');

async function testReports() {
  console.log('===============================================================');
  console.log('🧪 TEST: Módulo de Reportes & KPIs Mensuales (Plan 05-01)');
  console.log('===============================================================\n');

  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(3012, async () => {
    try {
      // 1. Reporte de Separadores
      console.log('🔹 1. Consultando Reporte de Separadores...');
      const resSep = await fetch('http://localhost:3012/api/reportes/separadores').then(r => r.json());
      if (!resSep.success) throw new Error('Endpoint separadores falló');
      console.log(`   - Total separadores reportados: ${resSep.reporte.length}`);
      resSep.reporte.forEach(s => {
        console.log(`     • ${s.operario_nombre} -> Notas: ${s.total_notas}, Piezas: ${s.total_piezas}, Tiempo Total: ${s.tiempo_total_fmt}, Seg/Bip: ${s.segundos_por_bip}s`);
      });

      // 2. Reporte de Guardadores / Mesas
      console.log('\n🔹 2. Consultando Reporte de Guardadores (Mesas)...');
      const resGuard = await fetch('http://localhost:3012/api/reportes/guardadores').then(r => r.json());
      if (!resGuard.success) throw new Error('Endpoint guardadores falló');
      console.log(`   - Total guardadores reportados: ${resGuard.reporte.length}`);
      resGuard.reporte.forEach(g => {
        console.log(`     • ${g.operario_nombre} -> Notas Revisadas: ${g.total_notas}, Tiempo Empaque: ${g.tiempo_total_mesa_fmt}, Ciclo Total: ${g.tiempo_total_ciclo_fmt}`);
      });

      // 3. Descarga de CSV compatible con Excel
      console.log('\n🔹 3. Probando exportación CSV para Excel...');
      const resCsv = await fetch('http://localhost:3012/api/reportes/exportar/csv?tipo=separadores');
      const csvText = await resCsv.text();
      if (!csvText.startsWith('\uFEFF')) {
        console.warn('Advertencia: El CSV debería iniciar con BOM UTF-8');
      }
      console.log('   - Tamaño de archivo CSV recibido:', csvText.length, 'bytes');
      console.log('   - Primeras 3 líneas del CSV:');
      csvText.split('\n').slice(0, 3).forEach(l => console.log('     ' + l));

      console.log('\n===============================================================');
      console.log('🎉 ¡TODAS LAS PRUEBAS DE REPORTES Y EXPORTACIÓN PASARON EXITOSAMENTE!');
      console.log('===============================================================');
    } catch (err) {
      console.error('❌ Error en test de reportes:', err);
      process.exitCode = 1;
    } finally {
      const pool = require('../src/config/db');
      await pool.end();
      server.close();
    }
  });
}

testReports();
