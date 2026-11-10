const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'mysql.motosmendes.com',
            user: 'motosmendes02',
            password: 'Moto123',
            database: 'motosmendes02'
        });
        const [[{total}]] = await conn.query("SELECT COUNT(*) as total FROM clients");
        const [[{activos}]] = await conn.query("SELECT COUNT(*) as total FROM clients WHERE is_active = 1");
        console.log("Total en clients de motosmendes02:", total);
        console.log("Activos en clients de motosmendes02:", activos);
        
        const [samples] = await conn.query("SELECT id, codigo, name, credit_limit, payment_condition, is_active FROM clients ORDER BY id DESC LIMIT 5");
        console.log("Ultimos 5:", samples);
        
        await conn.end();
    } catch(e) {
        console.error("Error conectando a cloud MySQL:", e.message);
    }
})();
