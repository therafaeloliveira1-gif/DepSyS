const Firebird = require('node-firebird');

const fbConfig = {
  host: '127.0.0.1',
  port: 3050,
  database: 'c:/WorkSpace/motos-mendes-data/FB_DATA/FB_DADOS.FDB',
  user: 'SYSDBA',
  password: 'masterkey',
  lowercase_keys: true
};

function consultarStockTeorico(codProd) {
  return new Promise((resolve, reject) => {
    Firebird.attach(fbConfig, (err, db) => {
      if (err) return reject(err);

      // EXCLUSIVAMENTE LECTURA (SELECT)
      const sql = `
        SELECT FIRST 1 
          p.CODPROD, p.DESCRICAO, p.CODBAR,
          COALESCE(q.QTFISICA, 0) as QTFISICA,
          COALESCE(q.QTRESERVA, 0) as QTRESERVA,
          COALESCE(q.QTEMPENHADA, 0) as QTEMPENHADA,
          COALESCE(q.QTDEPOSITO1, 0) as QTDEPOSITO1,
          l.DESCRICAO as UBICACION_ESTANTE
        FROM PRD_PRODUTO p
        LEFT JOIN PRD_QTDE q ON q.CODPROD = p.CODPROD
        LEFT JOIN PRD_PRDLOCAL l ON l.CODPROD = p.CODPROD
        WHERE p.CODPROD = ? OR p.CODBAR = ?
      `;

      db.query(sql, [codProd, codProd], (qErr, rows) => {
        db.detach();
        if (qErr) return reject(qErr);
        if (!rows || rows.length === 0) return resolve(null);
        resolve(rows[0]);
      });
    });
  });
}

async function testStock() {
  console.log('🧪 Probando consulta SELECT de stock teórico en Firebird (100% Solo Lectura)...');
  // Consultar producto 3019 (de la nota 38002)
  const prod = await consultarStockTeorico('3019');
  console.log('Resultado producto 3019:', prod);
  if (prod) {
    console.log(`✅ SKU: ${prod.codprod} - ${prod.descricao?.trim()}`);
    console.log(`   Stock Físico Teórico: ${prod.qtfisica} unidades`);
    console.log(`   Ubicación estante: ${prod.ubicacion_estante ? prod.ubicacion_estante.trim() : 'Sin ubicación'}`);
  }
}

testStock().then(() => setTimeout(() => process.exit(0), 100));
