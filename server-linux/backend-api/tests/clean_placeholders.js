const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function run() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'Rafael',
    password: process.env.MYSQL_PASSWORD || 'Mendes-1734*',
    database: process.env.MYSQL_DATABASE || 'mendes_db'
  });

  const placeholders = ['SEP01', 'SEP02', 'GRD01', 'GRD02', 'GRD03', 'SUP01', 'SUP02', 'SUP03'];
  const [res] = await pool.query(
    "UPDATE tbl_operarios SET activo = 0 WHERE codigo IN (?, ?, ?, ?, ?, ?, ?, ?)",
    placeholders
  );
  console.log('Filas de placeholders/test desactivadas:', res.affectedRows);

  const [separadores] = await pool.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'SEPARADOR' AND activo = 1 ORDER BY codigo ASC");
  console.log(`\nSeparadores activos (${separadores.length}):`);
  console.table(separadores);

  const [guardadores] = await pool.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'GUARDADOR' AND activo = 1 ORDER BY codigo ASC");
  console.log(`\nGuardadores activos (${guardadores.length}):`);
  console.table(guardadores);

  const [supervisores] = await pool.query("SELECT id, codigo, nombre FROM tbl_operarios WHERE rol = 'SUPERVISOR' AND activo = 1 ORDER BY codigo ASC");
  console.log(`\nSupervisores activos (${supervisores.length}):`);
  console.table(supervisores);

  await pool.end();
}

run().catch(console.error);
