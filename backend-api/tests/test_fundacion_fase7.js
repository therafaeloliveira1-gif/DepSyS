const pool = require('../src/config/db');
const {
  initDatabase,
  registrarNotaDesdeFirebird,
  asignarSeparadorANota,
  finalizarPickingYSugerirMesa,
  confirmarMesaSupervisor,
  iniciarRevisionMesa,
  finalizarRevisionMesa,
  getSupervisionEstadoGeneral,
  getColaMesa
} = require('../src/repositories/depositRepository');
const { getPedidoReal } = require('../src/services/orderService');

async function runTestFase7() {
  console.log('===============================================================');
  console.log('🧪 TEST: Flujo Completo Fase 7 - Fundación DepSystem');
  console.log('===============================================================\n');

  try {
    // 1. Inicializar DB
    console.log('🔹 1. Inicializando base de datos y catálogo de operarios/mesas...');
    await initDatabase();

    // 2. Sincronizar pedido real Firebird 38002
    console.log('\n🔹 2. Consultando pedido Firebird 38002...');
    const fbRes = await getPedidoReal('38002');
    if (!fbRes.success) throw new Error('Error al consultar Firebird: ' + fbRes.error);
    const regRes = await registrarNotaDesdeFirebird(fbRes.pedido);
    const notaId = regRes.nota.id;
    console.log(`✅ Pedido 38002 sincronizado con ID depósito: ${notaId} (Estado: ${regRes.nota.estado})`);

    // Resetear nota para test limpio
    await pool.query(`
      UPDATE tbl_notas_deposito 
      SET estado = 'PENDIENTE',
          separador_id = NULL,
          separador_nombre = NULL,
          inicio_separacion = NULL,
          fin_separacion = NULL,
          tiempo_neto_separacion_seg = 0,
          mesa_id = NULL,
          mesa_codigo = NULL,
          mesa_sugerida_codigo = NULL,
          fecha_espera_confirmacion = NULL,
          tiempo_espera_confirmacion_seg = 0,
          inicio_mesa = NULL,
          fin_mesa = NULL,
          tiempo_neto_mesa_seg = 0,
          tiempo_total_ciclo_seg = 0
      WHERE id = ?
    `, [notaId]);

    // 3. Test Estado General Supervisor (Antes de asignar: debe haber al menos un separador libre)
    console.log('\n🔹 3. Verificando estado general previo...');
    let estadoGen = await getSupervisionEstadoGeneral();
    const sepLibre = estadoGen.separadores.find(s => s.libre);
    console.log(`   - Separador disponible: ${sepLibre ? sepLibre.nombre : 'ninguno'}`);
    if (!sepLibre) throw new Error('No hay ningún separador activo y libre');

    // 4. Asignación directa por Supervisor (El reloj de picking arranca de inmediato)
    console.log(`\n🔹 4. Asignando nota a ${sepLibre.nombre} (${sepLibre.codigo})...`);
    const asigRes = await asignarSeparadorANota(notaId, sepLibre.id);
    if (!asigRes.success) throw new Error('Fallo al asignar separador');
    console.log(`✅ Nota asignada. Estado: ${asigRes.nota.estado}, Inicio: ${asigRes.nota.inicio_separacion}`);
    if (asigRes.nota.estado !== 'EN_PICKING') throw new Error('El estado debe ser EN_PICKING');
    if (!asigRes.nota.inicio_separacion) throw new Error('inicio_separacion debe estar seteado');

    // 5. Verificar que el separador ahora está OCUPADO en el panel
    estadoGen = await getSupervisionEstadoGeneral();
    const sepOcupado = estadoGen.separadores.find(s => s.id === sepLibre.id);
    console.log(`   - ${sepLibre.nombre} ocupado: ${!sepOcupado.libre} con pedido N° ${sepOcupado.notaActual.num_pedido}`);
    if (sepOcupado.libre) throw new Error(`${sepLibre.nombre} debería figurar ocupado`);

    // 6. Finalizar picking y sugerir Mesa 301
    console.log('\n🔹 6. Finalizando picking y sugiriendo Mesa 301...');
    // Simulamos 15 segundos de trabajo
    const finPickRes = await finalizarPickingYSugerirMesa(notaId, sepLibre.id, '301', 15);
    console.log(`✅ Picking finalizado. Estado: ${finPickRes.estado}, Mesa sugerida: ${finPickRes.mesaSugerida}`);
    if (finPickRes.estado !== 'ESPERA_CONFIRMACION') throw new Error('El estado debe ser ESPERA_CONFIRMACION');

    // 7. Verificar que la nota aparece en Espera de Confirmación en el panel del supervisor
    estadoGen = await getSupervisionEstadoGeneral();
    const notaEnEspera = estadoGen.esperaConfirmacion.find(n => n.id === notaId);
    console.log(`   - Nota en espera de confirmación: ${!!notaEnEspera}, sugerida para: ${notaEnEspera ? notaEnEspera.mesa_sugerida_codigo : ''}`);
    if (!notaEnEspera) throw new Error('La nota no figura en lista de espera de confirmación');

    // 8. Supervisor oficial confirma la Mesa 301
    const [[supervisor]] = await pool.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'SUPERVISOR' AND activo = 1 LIMIT 1");
    console.log(`\n🔹 8. Supervisor ${supervisor.nombre} (${supervisor.codigo}) confirma la Mesa 301...`);
    const confRes = await confirmarMesaSupervisor(notaId, supervisor.id, '301');
    console.log(`✅ Mesa confirmada: ${confRes.mesaCodigo} por ${confRes.supervisorNombre}. Estado: ${confRes.estado}`);
    if (confRes.estado !== 'ASIGNADO_MESA') throw new Error('El estado debe ser ASIGNADO_MESA');

    // 9. Verificar la cola de la Mesa 301 (Debe figurar la nota en espera, con reloj de mesa aún pausado)
    console.log('\n🔹 9. Consultando cola de Mesa 301...');
    const colaMesa = await getColaMesa('301');
    const notaEnMesa = colaMesa.notas.find(n => n.id === notaId);
    console.log(`   - Nota encontrada en cola de Mesa 301: ${!!notaEnMesa}, Estado: ${notaEnMesa ? notaEnMesa.estado : ''}`);
    if (!notaEnMesa) throw new Error('La nota no figura en la cola de Mesa 301');

    // 10. Operador de mesa escanea primer producto -> Inicia revisión y empaque
    const [[guardador]] = await pool.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'GUARDADOR' AND activo = 1 LIMIT 1");
    console.log(`\n🔹 10. Operador de mesa ${guardador.nombre} (${guardador.codigo}) inicia empaque...`);
    const revRes = await iniciarRevisionMesa(notaId, guardador.id);
    console.log(`✅ Empaque iniciado. Estado: ${revRes.estado}`);
    if (revRes.estado !== 'EN_EMPAQUE') throw new Error('El estado debe ser EN_EMPAQUE');

    // 11. Finalizar revisión en mesa
    console.log('\n🔹 11. Finalizando empaque (empaque normal de envío)...');
    const finMesaRes = await finalizarRevisionMesa(notaId, guardador.id, 25, false);
    console.log(`✅ Empaque completado. Estado: ${finMesaRes.estado}, Tiempo neto mesa: ${finMesaRes.tiempoNetoMesaSeg}s`);
    if (finMesaRes.estado !== 'LISTO_PARA_ENVIO') throw new Error('El estado debe ser LISTO_PARA_ENVIO');

    // 12. Verificar historial completo de transiciones
    console.log('\n🔹 12. Verificando historial forense en tbl_estados_historial...');
    const [historial] = await pool.query('SELECT * FROM tbl_estados_historial WHERE nota_id = ? ORDER BY id ASC', [notaId]);
    console.log(`✅ Transiciones registradas: ${historial.length}`);
    historial.forEach(h => {
      console.log(`   [${h.created_at.toISOString().split('T')[1].substring(0, 8)}] ${h.estado_anterior || 'INICIO'} ➔ ${h.estado_nuevo} (Operario: ${h.operario_nombre || 'N/A'})`);
    });

    if (historial.length < 4) {
      throw new Error('Faltaron registros en el historial de transiciones');
    }

    console.log('\n===============================================================');
    console.log('🎉 TODOS LOS TESTS DE LA FASE 7 (FUNDACIÓN) PASARON AL 100%');
    console.log('===============================================================');
    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    console.error('\n❌ ERROR EN EL TEST:', err.message);
    setTimeout(() => process.exit(1), 100);
  }
}

runTestFase7();
