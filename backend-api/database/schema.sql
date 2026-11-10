-- ====================================================================
-- ESQUEMA DE BASE DE DATOS: mendes_db (DepSystem - Motos Mendes)
-- ====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Operarios del Depósito
CREATE TABLE IF NOT EXISTS tbl_operarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(32) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    pin VARCHAR(32) DEFAULT '1234',
    rol ENUM('SEPARADOR', 'GUARDADOR', 'SUPERVISOR', 'ADMIN') NOT NULL DEFAULT 'SEPARADOR',
    activo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operario_rol (rol),
    INDEX idx_operario_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Mesas de Control y Bancadas Físicas (ej: Mesa 301, 302, 303, 304)
CREATE TABLE IF NOT EXISTS tbl_mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(32) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    estado ENUM('LIBRE', 'CON_NOTAS', 'EN_REVISION', 'MANTENIMIENTO') DEFAULT 'LIBRE',
    descripcion VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mesa_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Notas / Pedidos en Depósito (Trazabilidad Operativa)
CREATE TABLE IF NOT EXISTS tbl_notas_deposito (
    id INT AUTO_INCREMENT PRIMARY KEY,
    num_pedido VARCHAR(64) NOT NULL UNIQUE,
    cliente_codigo VARCHAR(32) DEFAULT '',
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_ciudad VARCHAR(100) DEFAULT '',
    cliente_telefono VARCHAR(50) DEFAULT '',
    vendedor_id INT DEFAULT 0,
    valor_total DECIMAL(14, 2) DEFAULT 0.00,
    total_items INT DEFAULT 0,
    total_piezas INT DEFAULT 0,
    total_bips_realizados INT DEFAULT 0,
    estado ENUM(
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
    ) DEFAULT 'PENDIENTE',
    
    supervisor_aprobador_id INT NULL,
    supervisor_aprobador_nombre VARCHAR(120) NULL,
    fecha_aprobacion_credito DATETIME NULL,
    motivo_retencion TEXT NULL,
    
    -- Métricas de Separación (Picking)
    separador_id INT NULL,
    separador_nombre VARCHAR(120) NULL,
    inicio_separacion DATETIME NULL,
    fin_separacion DATETIME NULL,
    tiempo_neto_separacion_seg INT DEFAULT 0,
    
    -- Asignación y Sugerencia de Mesa
    mesa_id INT NULL,
    mesa_codigo VARCHAR(32) NULL,
    mesa_sugerida_codigo VARCHAR(32) NULL,
    fecha_espera_confirmacion DATETIME NULL,
    tiempo_espera_confirmacion_seg INT DEFAULT 0,
    supervisor_confirmacion_id INT NULL,
    supervisor_confirmacion_nombre VARCHAR(120) NULL,
    
    -- Métricas de Mesa / Bancada (Checking & Packing)
    guardador_id INT NULL,
    guardador_nombre VARCHAR(120) NULL,
    inicio_mesa DATETIME NULL,
    fin_mesa DATETIME NULL,
    tiempo_neto_mesa_seg INT DEFAULT 0,
    
    -- Devoluciones y Tiempo de Error
    fecha_inicio_error DATETIME NULL,
    tiempo_error_seg INT DEFAULT 0,
    
    -- Ciclo Total y Prioridades
    tiempo_total_ciclo_seg INT DEFAULT 0,
    demora_excesiva TINYINT(1) DEFAULT 0,
    es_mostrador TINYINT(1) DEFAULT 0,
    permite_hora_extra TINYINT(1) DEFAULT 0,
    motivo_demora TEXT NULL,
    observaciones TEXT NULL,
    origen VARCHAR(64) DEFAULT 'FIREBIRD_SGLOJA_REAL',
    
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nd_estado (estado),
    INDEX idx_nd_num (num_pedido),
    INDEX idx_nd_separador (separador_id),
    INDEX idx_nd_mesa (mesa_codigo),
    INDEX idx_nd_fecha (fecha_ingreso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Historial de Transiciones de Estado
CREATE TABLE IF NOT EXISTS tbl_estados_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nota_id INT NOT NULL,
    estado_anterior VARCHAR(32) NULL,
    estado_nuevo VARCHAR(32) NOT NULL,
    operario_id INT NULL,
    operario_nombre VARCHAR(120) NULL,
    detalles JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_eh_nota (nota_id),
    INDEX idx_eh_estado (estado_nuevo),
    INDEX idx_eh_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Ítems del Pedido a Separar (Repuestos Reales SGLoja)
CREATE TABLE IF NOT EXISTS tbl_nota_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nota_id INT NOT NULL,
    num_item INT DEFAULT 1,
    sku VARCHAR(64) NOT NULL,
    codigo_barra VARCHAR(64) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    ubicacion VARCHAR(64) DEFAULT 'PAS-01',
    cantidad_requerida INT NOT NULL DEFAULT 1,
    cantidad_bipada INT NOT NULL DEFAULT 0,
    precio_unitario DECIMAL(12, 2) DEFAULT 0.00,
    subtotal DECIMAL(14, 2) DEFAULT 0.00,
    estado ENUM('PENDIENTE', 'COMPLETO', 'DIFERENCIA') DEFAULT 'PENDIENTE',
    FOREIGN KEY (nota_id) REFERENCES tbl_notas_deposito(id) ON DELETE CASCADE,
    INDEX idx_item_nota (nota_id),
    INDEX idx_item_sku (sku),
    INDEX idx_item_barcode (codigo_barra)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Auditoría Forense de Bips Láser (Registro segundo a segundo)
CREATE TABLE IF NOT EXISTS tbl_bips_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nota_id INT NOT NULL,
    operario_id INT NOT NULL,
    codigo_leido VARCHAR(128) NOT NULL,
    tipo_lectura ENUM('NOTA', 'PRODUCTO', 'MESA') DEFAULT 'PRODUCTO',
    es_valido TINYINT(1) DEFAULT 1,
    mensaje_error VARCHAR(255) NULL,
    timestamp_bip DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bip_nota (nota_id),
    INDEX idx_bip_operario (operario_id),
    INDEX idx_bip_timestamp (timestamp_bip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Pausas de Jornada (para el cómputo de Tiempo Neto)
CREATE TABLE IF NOT EXISTS tbl_pausas_jornada (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('GLOBAL_SUPERVISOR', 'FIN_TURNO', 'DESAYUNO_CAFE', 'ALMUERZO', 'OPERARIO_INDIVIDUAL') NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    operario_id INT NULL,
    nota_id INT NULL,
    inicio_pausa DATETIME NOT NULL,
    fin_pausa DATETIME NULL,
    duracion_segundos INT DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    INDEX idx_pausa_activo (activo),
    INDEX idx_pausa_fechas (inicio_pausa, fin_pausa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Configuración General de Turnos y Tolerancias
CREATE TABLE IF NOT EXISTS tbl_configuracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(64) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Discrepancias de Stock y Faltantes (Fase 8: Lectura pura Firebird + Registro MySQL)
CREATE TABLE IF NOT EXISTS tbl_discrepancias_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nota_id INT NOT NULL,
    num_pedido VARCHAR(64) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    codigo_barra VARCHAR(64) NULL,
    descripcion VARCHAR(255) NOT NULL,
    cantidad_requerida INT NOT NULL,
    stock_teorico_firebird DECIMAL(10, 2) DEFAULT 0.00,
    separador_id INT NOT NULL,
    separador_nombre VARCHAR(120) NOT NULL,
    supervisor_id INT NULL,
    supervisor_nombre VARCHAR(120) NULL,
    estado ENUM('PENDIENTE_REVISION', 'CONFIRMADO_FALTANTE', 'HALLADO_EN_DEPOSITO') DEFAULT 'PENDIENTE_REVISION',
    resolucion TEXT NULL,
    fecha_reporte DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_disc_nota (nota_id),
    INDEX idx_disc_sku (sku),
    INDEX idx_disc_estado (estado),
    INDEX idx_disc_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
