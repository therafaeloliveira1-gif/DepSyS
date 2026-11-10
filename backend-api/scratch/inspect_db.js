const db = require('../src/config/db');

(async () => {
    try {
        const [tables] = await db.query('SHOW TABLES');
        console.log('Tablas en mendes_db:');
        for (let row of tables) {
            let t = Object.values(row)[0];
            let [[{cnt}]] = await db.query("SELECT count(*) as cnt FROM " + t);
            console.log("  " + t + ": " + cnt);
        }
        process.exit(0);
    } catch(e) { 
        console.error(e); 
        process.exit(1);
    }
})();
