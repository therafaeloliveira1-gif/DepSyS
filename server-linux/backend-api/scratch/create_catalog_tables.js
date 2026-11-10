const db = require('../src/config/db');

async function migrate() {
    console.log("Iniciando creación de tablas tbl_clientes y tbl_productos en mendes_db...");

    // 1. tbl_clientes
    await db.query(`
        CREATE TABLE IF NOT EXISTS tbl_clientes (
            codigo INT PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            razon_social VARCHAR(255),
            ruc VARCHAR(50),
            email VARCHAR(150),
            telefono VARCHAR(100),
            vendedor_codigo INT DEFAULT 0,
            vendedor_nombre VARCHAR(150),
            limite_credito DECIMAL(16,2) DEFAULT 0.00,
            saldo_deudor DECIMAL(16,2) DEFAULT 0.00,
            saldo_disponible DECIMAL(16,2) DEFAULT 0.00,
            condicion_pago_codigo INT DEFAULT 1,
            condicion_pago VARCHAR(100) DEFAULT 'CONTADO',
            inactivo CHAR(1) DEFAULT 'N',
            ciudad VARCHAR(150),
            direccion VARCHAR(255),
            actualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nombre (nombre),
            INDEX idx_ruc (ruc),
            INDEX idx_vendedor (vendedor_codigo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Tabla tbl_clientes lista.");

    // 2. tbl_productos
    await db.query(`
        CREATE TABLE IF NOT EXISTS tbl_productos (
            codigo VARCHAR(50) PRIMARY KEY,
            descripcion VARCHAR(255) NOT NULL,
            codigo_barras VARCHAR(100),
            unidad_medida VARCHAR(20) DEFAULT 'UN',
            marca VARCHAR(100),
            categoria VARCHAR(100),
            stock_fisico DECIMAL(12,2) DEFAULT 0.00,
            stock_reservado DECIMAL(12,2) DEFAULT 0.00,
            stock_disponible DECIMAL(12,2) DEFAULT 0.00,
            precio_costo DECIMAL(16,2) DEFAULT 0.00,
            precio_venta DECIMAL(16,2) DEFAULT 0.00,
            activo CHAR(1) DEFAULT 'S',
            actualizado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_descripcion (descripcion),
            INDEX idx_codbarras (codigo_barras)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Tabla tbl_productos lista.");

    process.exit(0);
}

migrate().catch(err => {
    console.error("Error migrando tablas:", err);
    process.exit(1);
});
