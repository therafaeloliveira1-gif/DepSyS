const Firebird = require('node-firebird');

const fbConfig = {
  host: '127.0.0.1',
  port: 3050,
  database: 'c:/WorkSpace/motos-mendes-data/FB_DATA/FB_DADOS.FDB',
  user: 'SYSDBA',
  password: 'masterkey',
  lowercase_keys: true
};

Firebird.attach(fbConfig, (err, db) => {
  if (err) throw err;
  db.query('SELECT CODUSU, NOME, LOGIN, DEPTO FROM ADM_USUARIO ORDER BY CODUSU', [], (qErr, rows) => {
    db.detach();
    const matches = rows.filter(r => (r.nome || '').toUpperCase().includes('NELSON') || (r.login || '').toUpperCase().includes('NELSON'));
    console.log('Resultados búsqueda NELSON:', matches);
    process.exit(0);
  });
});
