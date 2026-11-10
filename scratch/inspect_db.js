const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost', user: 'root', password: '', database: 'mendes_db'
        });
        const [tables] = await conn.query('SHOW TABLES');
        console.log('Tablas en mendes_db:');
        for (let row of tables) {
            let t = Object.values(row)[0];
            let [[{cnt}]] = await conn.query("SELECT count(*) as cnt FROM " + t);
            console.log("  " + t + ": " + cnt);
        }
        await conn.end();
    } catch(e) { 
        console.error(e); 
    }
})();
