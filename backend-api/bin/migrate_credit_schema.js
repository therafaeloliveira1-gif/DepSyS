const pool = require('../src/config/db');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🔄 Actualizando ENUM estado y agregando columnas de crédito...');
    
    // 1. Modificar ENUM estado
    await conn.query(`
      ALTER TABLE tbl_notas_deposito 
      MODIFY COLUMN estado ENUM(
        'PENDIENTE',
        'EN_ESPERA',
        'CONFIRMADO',
        'SEPARANDO',
        'ESPERA_CONFIRMACION',
        'ASIGNADO_MESA',
        'EN_MESA',
        'ERROR_SEPARACION',
        'RETIRADO_MOSTRADOR',
        'LISTO_PARA_ENVIO',
        'FINALIZADO',
        'ENVIADO',
        'CANCELADO'
      ) DEFAULT 'PENDIENTE'
    `);
    console.log('✅ ENUM estado actualizado');

    // 2. Agregar columnas si no existen
    const [cols] = await conn.query('SHOW COLUMNS FROM tbl_notas_deposito');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('supervisor_aprobador_id')) {
      await conn.query('ALTER TABLE tbl_notas_deposito ADD COLUMN supervisor_aprobador_id INT NULL AFTER estado');
      console.log('✅ Agregada columna supervisor_aprobador_id');
    }
    if (!colNames.includes('supervisor_aprobador_nombre')) {
      await conn.query('ALTER TABLE tbl_notas_deposito ADD COLUMN supervisor_aprobador_nombre VARCHAR(120) NULL AFTER supervisor_aprobador_id');
      console.log('✅ Agregada columna supervisor_aprobador_nombre');
    }
    if (!colNames.includes('fecha_aprobacion_credito')) {
      await conn.query('ALTER TABLE tbl_notas_deposito ADD COLUMN fecha_aprobacion_credito DATETIME NULL AFTER supervisor_aprobador_nombre');
      console.log('✅ Agregada columna fecha_aprobacion_credito');
    }
    if (!colNames.includes('motivo_retencion')) {
      await conn.query('ALTER TABLE tbl_notas_deposito ADD COLUMN motivo_retencion TEXT NULL AFTER fecha_aprobacion_credito');
      console.log('✅ Agregada columna motivo_retencion');
    }

    console.log('🎉 Migración de base de datos completada exitosamente.');
  } catch (err) {
    console.error('❌ Error migrando base de datos:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
