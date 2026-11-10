const db = require('../src/config/db');

async function migrate() {
  try {
    // 1. Agregar mesa_codigo a tbl_operarios si no existe
    try {
      await db.query('ALTER TABLE tbl_operarios ADD COLUMN mesa_codigo VARCHAR(20) NULL AFTER rol');
      console.log('Columna mesa_codigo agregada a tbl_operarios');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('Columna mesa_codigo ya existía');
      else console.error(e);
    }

    // 2. Asociar cada guardador a su mesa según su código GRD3XX
    const [guardadores] = await db.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'GUARDADOR'");
    for (const g of guardadores) {
      const match = g.codigo.match(/GRD(\d+)/);
      const mesaCod = match ? match[1] : null;
      if (mesaCod) {
        await db.query('UPDATE tbl_operarios SET mesa_codigo = ? WHERE id = ?', [mesaCod, g.id]);
        console.log(`Guardador ${g.nombre} (${g.codigo}) -> Mesa ${mesaCod}`);
      }
    }

    // 3. Crear las 18 mesas en tbl_mesas
    const mesasDef = [
      { codigo: '301', nombre: 'Mesa 301 - Ramón Cardozo' },
      { codigo: '302', nombre: 'Mesa 302 - Leonardo Colmán' },
      { codigo: '303', nombre: 'Mesa 303 - Herminio Aguirre' },
      { codigo: '304', nombre: 'Mesa 304 - Eliel Días' },
      { codigo: '306', nombre: 'Mesa 306 - Cristian Benítez' },
      { codigo: '307', nombre: 'Mesa 307 - Paulo Ferreira' },
      { codigo: '308', nombre: 'Mesa 308 - Ever Cardozo' },
      { codigo: '309', nombre: 'Mesa 309 - Adriel Días' },
      { codigo: '310', nombre: 'Mesa 310 - Alex Maciel' },
      { codigo: '311', nombre: 'Mesa 311 - Luciano López' },
      { codigo: '312', nombre: 'Mesa 312 - Cristian Sanabria' },
      { codigo: '313', nombre: 'Mesa 313 - Ever Alonzo Báez' },
      { codigo: '314', nombre: 'Mesa 314 - Paulo Herique Mariano' },
      { codigo: '315', nombre: 'Mesa 315 - Rafael Candia' },
      { codigo: '316', nombre: 'Mesa 316 - Lucas Mendieta' },
      { codigo: '317', nombre: 'Mesa 317 - Germán Valdez' },
      { codigo: '318', nombre: 'Mesa 318 - Bancada 318' },
      { codigo: '319', nombre: 'Mesa 319 - Bancada 319' }
    ];

    for (const m of mesasDef) {
      await db.query(`
        INSERT INTO tbl_mesas (codigo, nombre, estado, descripcion)
        VALUES (?, ?, 'LIBRE', 'Bancada fija de verificación y empaque')
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
      `, [m.codigo, m.nombre]);
    }

    const [todasMesas] = await db.query('SELECT codigo, nombre, estado FROM tbl_mesas ORDER BY CAST(codigo AS UNSIGNED) ASC');
    console.log('Total mesas en tbl_mesas:', todasMesas.length);
    console.log('Mesas:', todasMesas.map(m => `Mesa ${m.codigo} (${m.nombre})`));
    process.exit(0);
  } catch (err) {
    console.error('Error migrando mesas:', err);
    process.exit(1);
  }
}

migrate();
