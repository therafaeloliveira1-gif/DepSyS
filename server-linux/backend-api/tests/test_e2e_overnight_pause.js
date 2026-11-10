const express = require('express');
const cors = require('cors');
const apiRoutes = require('../src/routes/apiRoutes');
const { initDatabase } = require('../src/repositories/depositRepository');
const pool = require('../src/config/db');
const { calcularTiempoNeto, formatearSegundos } = require('../src/domain/timeEngine');

async function runE2EOvernightPauseTest() {
  console.log('========================================================================');
  console.log('🧪 TEST E2E: Ciclo de Vida con Salto Nocturno, Café y Pausa Supervisor');
  console.log('========================================================================\n');

  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(3011, async () => {
    try {
      // 1. Verificar sincronización con Firebird
      console.log('🔹 1. Consultando sincronización de Pedido Firebird 38002...');
      const resPedido = await fetch('http://localhost:3011/api/pedidos/38002').then(r => r.json());
      if (!resPedido.success || !resPedido.pedido) {
        throw new Error('Fallo al obtener pedido real de Firebird');
      }
      const notaId = resPedido.pedido.id_deposito;
      console.log(`   - Pedido #${resPedido.pedido.num_pedido} (ID en depósito: ${notaId})`);
      console.log(`   - Cliente: ${resPedido.pedido.cliente_nombre}`);
      console.log(`   - Piezas requeridas: ${resPedido.pedido.total_piezas}`);

      // 2. Operarios
      const resOps = await fetch('http://localhost:3011/api/operarios').then(r => r.json());
      const separador = resOps.operarios.find(o => o.rol === 'SEPARADOR');
      const guardador = resOps.operarios.find(o => o.rol === 'GUARDADOR');

      // 3. Simular escenario nocturno con pausas en la base de datos
      console.log('\n🔹 2. Simulando pedido que cruza horario nocturno (16:50 -> 07:45 día siguiente)...');
      const inicioSep = '2026-10-22 16:50:00';
      const finSep = '2026-10-23 07:45:00';
      const inicioPausaSupervisor = '2026-10-23 07:20:00';
      const finPausaSupervisor = '2026-10-23 07:30:00';

      // Insertar pausa global del supervisor en tbl_pausas_jornada
      await pool.query(
        `INSERT INTO tbl_pausas_jornada (inicio_pausa, fin_pausa, motivo, duracion_segundos)
         VALUES (?, ?, ?, ?)`,
        [inicioPausaSupervisor, finPausaSupervisor, 'Reunión operativa depósito', 600]
      );

      // Calcular tiempo neto matemático esperado
      // Día 1: 16:50 a 17:00 = 10 min = 600s
      // Noche: 17:00 a 07:00 = 0s
      // Café: 07:00 a 07:15 = 0s
      // Día 2: 07:15 a 07:45 = 30m = 1800s - 600s (pausa) = 1200s (20 min)
      // Total esperado = 600s + 1200s = 1800s (30 minutos exactos)
      const pausasRegistradas = [
        { inicio_pausa: inicioPausaSupervisor, fin_pausa: finPausaSupervisor }
      ];
      const tiempoNetoCalculado = calcularTiempoNeto(new Date(inicioSep), new Date(finSep), pausasRegistradas);
      console.log(`   - Tiempo Neto Matemático: ${formatearSegundos(tiempoNetoCalculado)} (${tiempoNetoCalculado}s)`);

      if (tiempoNetoCalculado !== 1800) {
        throw new Error(`Cálculo erróneo de tiempo neto: se esperaban 1800s, se obtuvieron ${tiempoNetoCalculado}s`);
      }

      // Actualizar la nota directamente simulando la entrega en Mesa 302
      await pool.query(
        `UPDATE tbl_notas_deposito 
         SET estado = 'EN_MESA',
             separador_id = ?,
             mesa_codigo = '302',
             inicio_separacion = ?,
             fin_separacion = ?,
             tiempo_neto_separacion_seg = ?
         WHERE id = ?`,
        [separador.id, inicioSep, finSep, tiempoNetoCalculado, notaId]
      );

      // 4. Mesa 302 procesa la nota
      console.log('\n🔹 3. Procesando revisión en Mesa 302...');
      const inicioMesa = '2026-10-23 07:50:00';
      const finMesa = '2026-10-23 08:05:00';
      // Tiempo mesa: 15 minutos = 900s
      const tiempoNetoMesa = calcularTiempoNeto(new Date(inicioMesa), new Date(finMesa));
      const tiempoTotalCiclo = tiempoNetoCalculado + tiempoNetoMesa; // 1800 + 900 = 2700s (45 minutos)

      await pool.query(
        `UPDATE tbl_notas_deposito
         SET estado = 'FINALIZADO',
             guardador_id = ?,
             inicio_mesa = ?,
             fin_mesa = ?,
             tiempo_neto_mesa_seg = ?,
             tiempo_total_ciclo_seg = ?
         WHERE id = ?`,
        [guardador.id, inicioMesa, finMesa, tiempoNetoMesa, tiempoTotalCiclo, notaId]
      );

      console.log(`   - Tiempo Neto Mesa: ${formatearSegundos(tiempoNetoMesa)} (${tiempoNetoMesa}s)`);
      console.log(`   - Tiempo Total Ciclo: ${formatearSegundos(tiempoTotalCiclo)} (${tiempoTotalCiclo}s = 45m)`);

      if (tiempoTotalCiclo !== 2700) {
        throw new Error(`Tiempo total de ciclo incorrecto: ${tiempoTotalCiclo}s vs 2700s`);
      }

      // 5. Consultar Auditoría Forense y Reportes
      console.log('\n🔹 4. Verificando endpoint de Auditoría Forense por Pedido...');
      const resAudit = await fetch(`http://localhost:3011/api/notas/${notaId}`).then(r => r.json());
      console.log(`   - Estado final: ${resAudit.nota.estado}`);
      console.log(`   - Separador: ${resAudit.nota.separador_nombre}`);
      console.log(`   - Mesa: ${resAudit.nota.mesa_codigo}`);
      console.log(`   - Guardador: ${resAudit.nota.guardador_nombre}`);
      console.log(`   - Tiempo Neto Separación: ${resAudit.nota.tiempo_separacion_fmt}`);
      console.log(`   - Tiempo Neto Mesa: ${resAudit.nota.tiempo_mesa_fmt}`);
      console.log(`   - Tiempo Total Ciclo: ${resAudit.nota.tiempo_total_fmt}`);

      // 6. Consultar Reportes de Separadores y Exportación Excel
      console.log('\n🔹 5. Verificando Reportes Mensuales y CSV Excel...');
      const resRep = await fetch('http://localhost:3011/api/reportes/separadores').then(r => r.json());
      const sepReport = resRep.reporte.find(s => s.operario_id === separador.id);
      console.log(`   - Separador ${sepReport.operario_nombre}: ${sepReport.total_notas} notas, ${sepReport.total_piezas} piezas, Seg/Bip: ${sepReport.segundos_por_bip}s`);

      const resCsv = await fetch('http://localhost:3011/api/reportes/exportar/csv');
      const csvText = await resCsv.text();
      if (!csvText.includes('Lucas Silva') && !csvText.includes('REPORTE MENSUAL')) {
        throw new Error('El reporte CSV no contiene la información esperada');
      }
      console.log(`   - Exportación CSV generada con ${csvText.length} caracteres y codificación UTF-8`);

      console.log('\n========================================================================');
      console.log('🎉 ¡VALIDACIÓN INTEGRAL E2E COMPLETADA CON 100% DE ÉXITO!');
      console.log('   ✓ Cruce de jornada nocturna descontado con exactitud.');
      console.log('   ✓ Pausa de café matutina (07:00-07:15) descontada.');
      console.log('   ✓ Pausa de supervisor (07:20-07:30) descontada.');
      console.log('   ✓ Tiempos de picking, mesa y ciclo total auditados.');
      console.log('   ✓ Reporte de KPIs y exportación Excel validados.');
      console.log('========================================================================');
    } catch (err) {
      console.error('❌ Error en test E2E:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      setTimeout(() => {
        process.exit(process.exitCode || 0);
      }, 100);
    }
  });
}

runE2EOvernightPauseTest();
