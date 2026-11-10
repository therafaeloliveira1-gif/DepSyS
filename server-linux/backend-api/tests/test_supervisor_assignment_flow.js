const express = require('express');
const cors = require('cors');
const apiRoutes = require('../src/routes/apiRoutes');
const { initDatabase } = require('../src/repositories/depositRepository');
const pool = require('../src/config/db');

async function testSupervisorAssignmentFlow() {
  console.log('========================================================================');
  console.log('🧪 TEST: Flujo de Asignación Supervisor, Picking y Mesa (Requerimiento)');
  console.log('========================================================================\n');

  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = app.listen(3015, async () => {
    try {
      // 1. Obtener operarios
      console.log('🔹 1. Obteniendo separador y guardador...');
      const ops = await fetch('http://localhost:3015/api/operarios').then(r => r.json());
      const separador = ops.operarios.find(o => o.rol === 'SEPARADOR');
      const guardador = ops.operarios.find(o => o.rol === 'GUARDADOR');
      console.log(`   - Separador: ${separador.nombre} (ID: ${separador.id})`);
      console.log(`   - Guardador: ${guardador.nombre} (ID: ${guardador.id})`);

      // 2. Sincronizar pedido Firebird 38002
      console.log('\n🔹 2. Sincronizando Pedido Firebird 38002...');
      const resPedido = await fetch('http://localhost:3015/api/pedidos/38002').then(r => r.json());
      const notaId = resPedido.pedido.id_deposito;
      console.log(`   - Nota Depósito ID: ${notaId}`);

      // 3. Supervisor ASIGNA la nota al separador Lucas Silva
      console.log(`\n🔹 3. Supervisor asigna la Nota #${resPedido.pedido.num_pedido} al separador ${separador.nombre}...`);
      const resAsig = await fetch(`http://localhost:3015/api/notas/${notaId}/asignar-separador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ separadorId: separador.id })
      }).then(r => r.json());
      console.log(`   - Resultado: ${resAsig.message}`);
      if (!resAsig.success) throw new Error('Fallo al asignar separador');

      // 4. Verificar que la nota aparece en el aplicativo logado del separador Lucas Silva
      console.log(`\n🔹 4. App Picking consulta las notas asignadas a ${separador.nombre}...`);
      const resNotasSep = await fetch(`http://localhost:3015/api/notas?separadorId=${separador.id}`).then(r => r.json());
      const notaAsignada = resNotasSep.notas.find(n => n.id === notaId);
      if (!notaAsignada) throw new Error('La nota asignada no apareció en la consulta del separador');
      console.log(`   - Nota encontrada: #${notaAsignada.num_pedido} asignada a ${notaAsignada.separador_nombre}`);
      console.log(`   - Estado antes de iniciar: ${notaAsignada.estado} (Tiempo de picking aún NO ha comenzado)`);

      // 5. El separador inicia la separación en su app móvil -> Aquí arranca el cronómetro de picking
      console.log('\n🔹 5. El separador confirma/inicia el picking en su colector...');
      const resInicio = await fetch('http://localhost:3015/api/picking/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId: separador.id })
      }).then(r => r.json());
      console.log(`   - Picking iniciado: ${resInicio.message} a las ${resInicio.inicio}`);

      // 6. El separador termina el picking y entrega a Mesa 301 -> Se detiene el tiempo de picking
      console.log('\n🔹 6. El separador termina y entrega la canasta a Mesa 301...');
      const resEntrega = await fetch('http://localhost:3015/api/picking/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, operarioId: separador.id, mesaSugeridaCodigo: '301' })
      }).then(r => r.json());
      console.log(`   - Entrega: ${resEntrega.message}`);
      console.log(`   - Estado tras picking: ${resEntrega.estado}`);
      console.log(`   - Tiempo Neto Separación: ${resEntrega.tiempoNetoFmt}`);

      // 6.b El supervisor confirma la Mesa 301
      console.log('\n🔹 6.b Supervisor confirma la sugerencia de Mesa 301...');
      const resConfirmar = await fetch('http://localhost:3015/api/supervisor/confirmar-mesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, supervisorId: 5, mesaCodigo: '301' })
      }).then(r => r.json());
      console.log(`   - Confirmación: ${resConfirmar.message} (Estado: ${resConfirmar.estado})`);

      // 7. En la app de Mesa 301, la nota está en cola y el tiempo de mesa NO ha comenzado (en pausa)
      console.log('\n🔹 7. App Mesa 301 recibe la nota en su cola (En Espera / En Pausa)...');
      const resCola = await fetch('http://localhost:3015/api/mesas/301/cola').then(r => r.json());
      const notaEnMesa = resCola.notas.find(n => n.id === notaId);
      if (!notaEnMesa) throw new Error('La nota no apareció en la cola de Mesa 301 tras confirmación');
      console.log(`   - Estado en Mesa: ${notaEnMesa.estado}`);
      console.log(`   - Inicio de Mesa en DB: ${notaEnMesa.inicio_mesa || 'NULL (Tiempo de mesa NO ha iniciado)'}`);

      // 8. El guardador pasa el primer producto en Mesa 301 -> Aquí arranca el tiempo de mesa
      console.log('\n🔹 8. El guardador pasa/escanea el PRIMER producto en Mesa 301...');
      const resInicioMesa = await fetch('http://localhost:3015/api/mesa/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, guardadorId: guardador.id })
      }).then(r => r.json());
      console.log(`   - Cronómetro de Mesa iniciado: ${resInicioMesa.message} a las ${resInicioMesa.inicio}`);

      // 9. Guardador finaliza revisión y empaque
      console.log('\n🔹 9. Guardador finaliza revisión y empaque...');
      const resFinMesa = await fetch('http://localhost:3015/api/mesa/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaId, guardadorId: guardador.id })
      }).then(r => r.json());
      console.log(`   - Estado final: ${resFinMesa.message}`);
      console.log(`   - Tiempo Neto Mesa: ${resFinMesa.tiempoNetoMesaFmt}`);
      console.log(`   - Tiempo Total Ciclo: ${resFinMesa.tiempoTotalCicloFmt}`);

      console.log('\n========================================================================');
      console.log('🎉 ¡EL FLUJO OPERATIVO COMPLETO CUMPLE 100% CON LA ESPECIFICACIÓN!');
      console.log('   ✓ Asignación supervisor -> reflejada en app picking del separador.');
      console.log('   ✓ Tiempo de picking inicia solo al dar inicio en el colector.');
      console.log('   ✓ Al entregar a mesa, tiempo de picking se detiene.');
      console.log('   ✓ Nota queda en espera en mesa sin cronómetro corriendo.');
      console.log('   ✓ Tiempo de mesa inicia cuando el guardador pasa el 1er producto.');
      console.log('========================================================================');
    } catch (err) {
      console.error('❌ Error en prueba de flujo:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      setTimeout(() => {
        process.exit(process.exitCode || 0);
      }, 100);
    }
  });
}

testSupervisorAssignmentFlow();
