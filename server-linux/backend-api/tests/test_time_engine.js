const { calcularTiempoNeto, formatearSegundos } = require('../src/domain/timeEngine');

function runTimeTests() {
  console.log('===============================================================');
  console.log('🧪 TEST: Motor Matemático de Tiempo Neto (Plan 01-03)');
  console.log('===============================================================\n');

  // Caso 1: Tarea diurna normal (30 minutos)
  const d1_inicio = new Date('2026-10-22T08:00:00'); // Jueves
  const d1_fin = new Date('2026-10-22T08:30:00');
  const seg1 = calcularTiempoNeto(d1_inicio, d1_fin);
  console.log(`🔹 Caso 1 (Diurno normal): ${formatearSegundos(seg1)} (${seg1}s)`);
  if (seg1 !== 1800) {
    console.error(`❌ Falló Caso 1: Se esperaban 1800s, se obtuvieron ${seg1}s`);
    process.exit(1);
  }

  // Caso 2: Tarea matutina que cruza el inicio oficial (07:15)
  // De 06:55 a 07:30 -> Válido solo de 07:15 a 07:30 = 15 minutos (900s)
  const d2_inicio = new Date('2026-10-22T06:55:00');
  const d2_fin = new Date('2026-10-22T07:30:00');
  const seg2 = calcularTiempoNeto(d2_inicio, d2_fin);
  console.log(`🔹 Caso 2 (Pausa de café entrada hasta 07:15): ${formatearSegundos(seg2)} (${seg2}s)`);
  if (seg2 !== 900) {
    console.error(`❌ Falló Caso 2: Se esperaban 900s, se obtuvieron ${seg2}s`);
    process.exit(1);
  }

  // Caso 3: De un día para otro (Jueves 16:50 a Viernes 07:25)
  // Jueves (16:50 a 17:00) = 10 min
  // Noche (17:00 a 07:15) = 0 min (descontado)
  // Viernes (07:15 a 07:25) = 10 min
  // Total Neto = 20 minutos (1200s)
  const d3_inicio = new Date('2026-10-22T16:50:00');
  const d3_fin = new Date('2026-10-23T07:25:00');
  const seg3 = calcularTiempoNeto(d3_inicio, d3_fin);
  console.log(`🔹 Caso 3 (De un día para otro): ${formatearSegundos(seg3)} (${seg3}s)`);
  if (seg3 !== 1200) {
    console.error(`❌ Falló Caso 3: Se esperaban 1200s (20m), se obtuvieron ${seg3}s`);
    process.exit(1);
  }

  // Caso 4: Pausa Manual del Supervisor (15 min de pausa durante la mañana)
  const d4_inicio = new Date('2026-10-22T09:00:00');
  const d4_fin = new Date('2026-10-22T10:00:00');
  const pausasManuales = [
    { inicio_pausa: '2026-10-22T09:15:00', fin_pausa: '2026-10-22T09:30:00' }
  ];
  const seg4 = calcularTiempoNeto(d4_inicio, d4_fin, pausasManuales);
  console.log(`🔹 Caso 4 (Pausa manual supervisor): ${formatearSegundos(seg4)} (${seg4}s)`);
  if (seg4 !== 2700) {
    console.error(`❌ Falló Caso 4: Se esperaban 2700s (45m), se obtuvieron ${seg4}s`);
    process.exit(1);
  }

  // Caso 5: Descuento automático de Almuerzo (11:30 a 13:00 = 90 min)
  // Tarea de 11:00 a 13:30 (150 min brutos)
  // 11:00 a 11:30 = 30m; 11:30 a 13:00 = 0m; 13:00 a 13:30 = 30m. Total = 60m (3600s)
  const d5_inicio = new Date('2026-10-22T11:00:00');
  const d5_fin = new Date('2026-10-22T13:30:00');
  const seg5 = calcularTiempoNeto(d5_inicio, d5_fin);
  console.log(`🔹 Caso 5 (Almuerzo automático 11:30-13:00): ${formatearSegundos(seg5)} (${seg5}s)`);
  if (seg5 !== 3600) {
    console.error(`❌ Falló Caso 5: Se esperaban 3600s (60m), se obtuvieron ${seg5}s`);
    process.exit(1);
  }

  // Caso 6: Descuento automático de Café de la tarde (15:30 a 15:45 = 15 min)
  // Tarea de 15:00 a 16:00 (60 min brutos) -> 45 min trabajados (2700s)
  const d6_inicio = new Date('2026-10-22T15:00:00');
  const d6_fin = new Date('2026-10-22T16:00:00');
  const seg6 = calcularTiempoNeto(d6_inicio, d6_fin);
  console.log(`🔹 Caso 6 (Café tarde automático 15:30-15:45): ${formatearSegundos(seg6)} (${seg6}s)`);
  if (seg6 !== 2700) {
    console.error(`❌ Falló Caso 6: Se esperaban 2700s (45m), se obtuvieron ${seg6}s`);
    process.exit(1);
  }

  // Caso 7: Fin de semana no laborable (Viernes 16:50 a Lunes 07:25)
  // Viernes 2026-10-23 16:50 a 17:00 = 10 min
  // Sábado 2026-10-24 = 0 min
  // Domingo 2026-10-25 = 0 min
  // Lunes 2026-10-26 07:15 a 07:25 = 10 min
  // Total = 20 min (1200s)
  const d7_inicio = new Date('2026-10-23T16:50:00'); // Viernes
  const d7_fin = new Date('2026-10-26T07:25:00');    // Lunes
  const seg7 = calcularTiempoNeto(d7_inicio, d7_fin);
  console.log(`🔹 Caso 7 (Viernes a Lunes sin fin de semana): ${formatearSegundos(seg7)} (${seg7}s)`);
  if (seg7 !== 1200) {
    console.error(`❌ Falló Caso 7: Se esperaban 1200s (20m), se obtuvieron ${seg7}s`);
    process.exit(1);
  }

  // Caso 8: Horas extras
  // Tarea de 16:50 a 17:40 (50 min brutos)
  // Sin hora extra: solo cuenta 16:50 a 17:00 = 10m (600s)
  const seg8_sinExtra = calcularTiempoNeto('2026-10-22T16:50:00', '2026-10-22T17:40:00', [], { permiteHoraExtra: false });
  // Con hora extra: cuenta 16:50 a 17:40 = 50m (3000s)
  const seg8_conExtra = calcularTiempoNeto('2026-10-22T16:50:00', '2026-10-22T17:40:00', [], { permiteHoraExtra: true });
  console.log(`🔹 Caso 8a (Sin hora extra 16:50 a 17:40): ${formatearSegundos(seg8_sinExtra)} (${seg8_sinExtra}s)`);
  console.log(`🔹 Caso 8b (Con hora extra 16:50 a 17:40): ${formatearSegundos(seg8_conExtra)} (${seg8_conExtra}s)`);
  if (seg8_sinExtra !== 600 || seg8_conExtra !== 3000) {
    console.error('❌ Falló Caso 8 de hora extra');
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('🎉 TODOS LOS CASOS DE PRUEBA DEL MOTOR DE TIEMPO PASARON (100% PRECISIÓN)');
  console.log('===============================================================');
  setTimeout(() => process.exit(0), 100);
}

runTimeTests();
