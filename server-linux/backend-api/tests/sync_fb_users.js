const Firebird = require('node-firebird');
const pool = require('../src/config/db');

const fbConfig = {
  host: '127.0.0.1',
  port: 3050,
  database: 'c:/WorkSpace/motos-mendes-data/FB_DATA/FB_DADOS.FDB',
  user: 'SYSDBA',
  password: 'masterkey',
  lowercase_keys: true
};

async function syncOperariosFromFirebird() {
  console.log('🔄 Sincronizando usuarios reales desde Firebird ADM_USUARIO hacia MySQL mendes_db...');

  return new Promise((resolve, reject) => {
    Firebird.attach(fbConfig, async (err, db) => {
      if (err) return reject(err);

      // SELECT 100% SOLO LECTURA
      const sql = `
        SELECT CODUSU, NOME, LOGIN, DEPTO, TIPO, INATIVO
        FROM ADM_USUARIO
        WHERE DEPTO LIKE '%SEPARAD%' 
           OR DEPTO LIKE '%GUARDAD%' 
           OR DEPTO LIKE '%DEPOSIT%' 
           OR CODUSU IN (1, 4, 5, 6, 8, 11)
        ORDER BY DEPTO, CODUSU
      `;

      db.query(sql, [], async (qErr, rows) => {
        db.detach();
        if (qErr) return reject(qErr);

        console.log(`📥 ${rows.length} usuarios reales leídos desde Firebird.`);

        const conn = await pool.getConnection();
        try {
          let insertados = 0;
          let actualizados = 0;

          for (const u of rows) {
            const depto = (u.depto || '').toUpperCase();
            let rol = 'SEPARADOR';
            let prefijo = 'SEP';

            if (depto.includes('GUARDAD')) {
              rol = 'GUARDADOR';
              prefijo = 'GRD';
            } else if (depto.includes('DEPOSIT') || [6, 8, 11].includes(u.codusu)) {
              rol = 'SUPERVISOR';
              prefijo = 'SUP';
            }

            const codigo = `${prefijo}${String(u.codusu).padStart(3, '0')}`;
            const nombre = (u.nome || u.login || `Usuario ${u.codusu}`).trim();
            const activo = u.inativo === 'S' ? 0 : 1;

            // Insertar o actualizar en MySQL
            const [res] = await conn.query(`
              INSERT INTO tbl_operarios (codigo, nombre, pin, rol, activo)
              VALUES (?, ?, '1234', ?, ?)
              ON DUPLICATE KEY UPDATE 
                nombre = VALUES(nombre),
                rol = VALUES(rol),
                activo = VALUES(activo)
            `, [codigo, nombre, rol, activo]);

            if (res.affectedRows === 1) insertados++;
            else if (res.affectedRows === 2) actualizados++;
          }

          console.log(`✅ Sincronización completada: ${insertados} insertados, ${actualizados} actualizados.`);

          const [[{ countSep }]] = await conn.query("SELECT COUNT(*) as countSep FROM tbl_operarios WHERE rol = 'SEPARADOR' AND activo = 1");
          const [[{ countGrd }]] = await conn.query("SELECT COUNT(*) as countGrd FROM tbl_operarios WHERE rol = 'GUARDADOR' AND activo = 1");
          const [[{ countSup }]] = await conn.query("SELECT COUNT(*) as countSup FROM tbl_operarios WHERE rol = 'SUPERVISOR' AND activo = 1");

          console.log(`\n📊 TOTALES ACTUALES EN mendes_db:`);
          console.log(`   - Separadores activos: ${countSep}`);
          console.log(`   - Guardadores activos: ${countGrd}`);
          console.log(`   - Supervisores activos: ${countSup}`);

          resolve();
        } finally {
          conn.release();
        }
      });
    });
  });
}

syncOperariosFromFirebird()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
