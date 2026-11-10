const pool = require('../config/db');
const { formatearSegundos } = require('../domain/timeEngine');

/**
 * Reporte mensual consolidado de Separadores (Picking)
 * Métricas: Notas procesadas, piezas, bips totales, tiempo promedio por nota y segundos por bip.
 */
async function getReporteSeparadores(mes) {
  let dateFilter = '';
  const params = [];

  if (mes) {
    // Formato mes: YYYY-MM
    dateFilter = ' AND DATE_FORMAT(n.fin_separacion, "%Y-%m") = ?';
    params.push(mes);
  }

  const [rows] = await pool.query(`
    SELECT 
      o.id as operario_id,
      o.codigo as operario_codigo,
      o.nombre as operario_nombre,
      COUNT(CASE WHEN n.id IS NOT NULL THEN 1 END) as total_notas,
      COALESCE(SUM(n.total_piezas), 0) as total_piezas,
      COALESCE(SUM(n.total_bips_realizados), 0) as total_bips,
      COALESCE(SUM(n.tiempo_neto_separacion_seg), 0) as tiempo_total_seg,
      ROUND(COALESCE(AVG(n.tiempo_neto_separacion_seg), 0)) as tiempo_promedio_nota_seg,
      ROUND(
        CASE 
          WHEN COALESCE(SUM(n.total_bips_realizados), 0) > 0 
          THEN SUM(n.tiempo_neto_separacion_seg) / SUM(n.total_bips_realizados)
          ELSE 0 
        END, 1
      ) as segundos_por_bip
    FROM tbl_operarios o
    LEFT JOIN tbl_notas_deposito n ON n.separador_id = o.id AND n.estado IN ('EN_MESA', 'FINALIZADO') ${dateFilter}
    WHERE o.rol = 'SEPARADOR' AND o.activo = 1
    GROUP BY o.id, o.codigo, o.nombre
    ORDER BY total_piezas DESC, total_notas DESC
  `, params);

  return rows.map(r => ({
    ...r,
    tiempo_total_fmt: formatearSegundos(r.tiempo_total_seg),
    tiempo_promedio_nota_fmt: formatearSegundos(r.tiempo_promedio_nota_seg),
    segundos_por_bip: Number(r.segundos_por_bip) || 0
  }));
}

/**
 * Reporte mensual consolidado de Guardadores / Mesas (Empaque y Revisión)
 * Métricas: Notas revisadas, piezas embaladas, tiempo promedio de empaque y tiempo total de ciclo.
 */
async function getReporteGuardadores(mes) {
  let dateFilter = '';
  const params = [];

  if (mes) {
    dateFilter = ' AND DATE_FORMAT(n.fin_mesa, "%Y-%m") = ?';
    params.push(mes);
  }

  const [rows] = await pool.query(`
    SELECT 
      o.id as operario_id,
      o.codigo as operario_codigo,
      o.nombre as operario_nombre,
      COUNT(CASE WHEN n.id IS NOT NULL THEN 1 END) as total_notas,
      COALESCE(SUM(n.total_piezas), 0) as total_piezas,
      COALESCE(SUM(n.tiempo_neto_mesa_seg), 0) as tiempo_total_mesa_seg,
      ROUND(COALESCE(AVG(n.tiempo_neto_mesa_seg), 0)) as tiempo_promedio_mesa_seg,
      COALESCE(SUM(n.tiempo_total_ciclo_seg), 0) as tiempo_total_ciclo_seg
    FROM tbl_operarios o
    LEFT JOIN tbl_notas_deposito n ON n.guardador_id = o.id AND n.estado = 'FINALIZADO' ${dateFilter}
    WHERE o.rol = 'GUARDADOR' AND o.activo = 1
    GROUP BY o.id, o.codigo, o.nombre
    ORDER BY total_notas DESC, total_piezas DESC
  `, params);

  return rows.map(r => ({
    ...r,
    tiempo_total_mesa_fmt: formatearSegundos(r.tiempo_total_mesa_seg),
    tiempo_promedio_mesa_fmt: formatearSegundos(r.tiempo_promedio_mesa_seg),
    tiempo_total_ciclo_fmt: formatearSegundos(r.tiempo_total_ciclo_seg)
  }));
}

/**
 * Genera el contenido de un archivo CSV con formato compatible con Microsoft Excel (BOM UTF-8)
 */
function generarCsv(tipo, datos, mes) {
  const BOM = '\uFEFF';
  let csv = BOM;
  const mesFmt = mes && mes.includes('-') ? mes.split('-').reverse().join('/') : (mes || 'Todos');

  if (tipo === 'separadores') {
    csv += `REPORTE MENSUAL DE SEPARADORES (PICKING) - MOTOS MENDES S.A.;Mes: ${mesFmt}\n\n`;
    csv += 'Código;Separador;Notas Procesadas;Total Piezas;Total Bips;Tiempo Total Neto;Promedio por Nota;Segundos por Bip\n';
    datos.forEach(d => {
      csv += `${d.operario_codigo};${d.operario_nombre};${d.total_notas};${d.total_piezas};${d.total_bips};"${d.tiempo_total_fmt}";"${d.tiempo_promedio_nota_fmt}";${d.segundos_por_bip}\n`;
    });
  } else {
    csv += `REPORTE MENSUAL DE GUARDADORES (MESAS) - MOTOS MENDES S.A.;Mes: ${mesFmt}\n\n`;
    csv += 'Código;Guardador;Notas Revisadas;Total Piezas;Tiempo Total Mesa;Promedio por Nota;Tiempo Total Ciclo\n';
    datos.forEach(d => {
      csv += `${d.operario_codigo};${d.operario_nombre};${d.total_notas};${d.total_piezas};"${d.tiempo_total_mesa_fmt}";"${d.tiempo_promedio_mesa_fmt}";"${d.tiempo_total_ciclo_fmt}"\n`;
    });
  }

  return csv;
}

module.exports = {
  getReporteSeparadores,
  getReporteGuardadores,
  generarCsv
};
