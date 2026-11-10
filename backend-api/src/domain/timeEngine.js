/**
 * Motor de Tiempo Neto Laboral - DepSystem Motos Mendes
 * 
 * Reglas de negocio confirmadas:
 * 1. Horario de jornada oficial: Lunes a Viernes. Sábados y domingos NO se trabaja.
 * 2. Horario de entrada: 07:00 (va directo al café).
 * 3. Inicio del cronómetro laboral: 07:15 (435 min del día).
 * 4. Almuerzo automático: 11:30 a 13:00 (690 a 780 min = 90 min descontados).
 * 5. Café de la tarde automático: 15:30 a 15:45 (930 a 945 min = 15 min descontados).
 * 6. Fin de turno estándar: 17:00 (1020 min).
 * 7. Si permite_hora_extra = false, se descuenta desde las 17:00 hasta las 07:15 del siguiente día hábil.
 * 8. Si permite_hora_extra = true, el tiempo posterior a las 17:00 continúa sumando.
 * 9. Pausas maestras manuales (registradas por el supervisor en tbl_pausas_jornada): se descuentan
 *    sin doble cómputo si coinciden con descansos automáticos.
 */

const DEFAULT_CONFIG = {
  inicioTurnoMin: 7 * 60 + 15,       // 07:15 (435 min)
  finTurnoMin: 17 * 60,             // 17:00 (1020 min)
  inicioAlmuerzoMin: 11 * 60 + 30,  // 11:30 (690 min)
  finAlmuerzoMin: 13 * 60,          // 13:00 (780 min)
  inicioCafeTardeMin: 15 * 60 + 30, // 15:30 (930 min)
  finCafeTardeMin: 15 * 60 + 45,    // 15:45 (945 min)
  permiteHoraExtra: false
};

/**
 * Determina si un instante (Date) corresponde a un día laboral (Lunes=1 a Viernes=5).
 */
function esDiaLaboral(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Calcula los segundos netos efectivos trabajados entre fechaInicio y fechaFin.
 * @param {Date|string|number} fechaInicio - Timestamp de inicio de la tarea
 * @param {Date|string|number} fechaFin - Timestamp de fin de la tarea (o Date.now())
 * @param {Array} pausasRegistradas - Array de pausas { inicio_pausa, fin_pausa }
 * @param {Object} customConfig - Opciones de turno si difieren de las estándar
 * @returns {number} Segundos netos efectivos
 */
function calcularTiempoNeto(fechaInicio, fechaFin, pausasRegistradas = [], customConfig = {}) {
  if (!fechaInicio) return 0;

  const startMs = new Date(fechaInicio).getTime();
  const endMs = fechaFin ? new Date(fechaFin).getTime() : Date.now();

  if (endMs <= startMs || isNaN(startMs) || isNaN(endMs)) return 0;

  const cfg = { ...DEFAULT_CONFIG, ...customConfig };

  // Mapear pausas manuales a milisegundos para chequeo rápido
  const intervalosPausa = pausasRegistradas.map(p => ({
    inicio: new Date(p.inicio_pausa).getTime(),
    fin: p.fin_pausa ? new Date(p.fin_pausa).getTime() : Date.now()
  })).filter(p => p.fin > p.inicio);

  let segundosValidos = 0;
  const ONE_MINUTE_MS = 60 * 1000;

  // Si el intervalo total es menor a 1 minuto, calcular proporcionalmente
  if (endMs - startMs < ONE_MINUTE_MS) {
    const d = new Date(startMs);
    if (!esDiaLaboral(d)) return 0;

    const minOfDay = d.getHours() * 60 + d.getMinutes();
    const enTurno = cfg.permiteHoraExtra
      ? minOfDay >= cfg.inicioTurnoMin
      : (minOfDay >= cfg.inicioTurnoMin && minOfDay < cfg.finTurnoMin);

    const enAlmuerzo = minOfDay >= cfg.inicioAlmuerzoMin && minOfDay < cfg.finAlmuerzoMin;
    const enCafeTarde = minOfDay >= cfg.inicioCafeTardeMin && minOfDay < cfg.finCafeTardeMin;
    const enPausaManual = intervalosPausa.some(p => startMs >= p.inicio && startMs < p.fin);

    return (enTurno && !enAlmuerzo && !enCafeTarde && !enPausaManual)
      ? Math.round((endMs - startMs) / 1000)
      : 0;
  }

  // Iteración minuto a minuto para precisión exacta
  let cur = startMs;
  while (cur < endMs) {
    const d = new Date(cur);

    // Solo computa si es día laboral (Lunes a Viernes)
    if (esDiaLaboral(d)) {
      const minOfDay = d.getHours() * 60 + d.getMinutes();

      // 1. ¿Está dentro de la jornada o en hora extra habilitada?
      const enTurno = cfg.permiteHoraExtra
        ? minOfDay >= cfg.inicioTurnoMin
        : (minOfDay >= cfg.inicioTurnoMin && minOfDay < cfg.finTurnoMin);

      // 2. ¿Está en receso automático de almuerzo (11:30 a 13:00)?
      const enAlmuerzo = minOfDay >= cfg.inicioAlmuerzoMin && minOfDay < cfg.finAlmuerzoMin;

      // 3. ¿Está en receso automático de café de la tarde (15:30 a 15:45)?
      const enCafeTarde = minOfDay >= cfg.inicioCafeTardeMin && minOfDay < cfg.finCafeTardeMin;

      // 4. ¿Está dentro de una pausa manual del supervisor?
      const enPausaManual = intervalosPausa.some(p => cur >= p.inicio && cur < p.fin);

      if (enTurno && !enAlmuerzo && !enCafeTarde && !enPausaManual) {
        const step = Math.min(ONE_MINUTE_MS, endMs - cur);
        segundosValidos += step / 1000;
      }
    }

    cur += ONE_MINUTE_MS;
  }

  return Math.round(segundosValidos);
}

/**
 * Formatea segundos en string HH:MM:SS.
 * @param {number} segundos 
 * @returns {string} Ejemplo: "00:15:30"
 */
function formatearSegundos(segundos) {
  if (!segundos || segundos < 0 || isNaN(segundos)) return '00:00:00';
  const s = Math.round(segundos);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = n => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

module.exports = {
  calcularTiempoNeto,
  formatearSegundos,
  DEFAULT_CONFIG,
  esDiaLaboral
};
