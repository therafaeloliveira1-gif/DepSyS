---
phase: 01-backend-core-adaptador-firebird-motor-de-tiempo-neto
plan: 02
subsystem: database
tags: [mysql, schema, mendes_db, barcode, picking, tables]

requires:
  - phase: 01-01
    provides: "orderService y datos reales de Firebird SGLoja"
provides:
  - "Esquema relacional de depósito en MySQL mendes_db (7 tablas)"
  - "Pool de conexiones mysql2 y repositorio depositRepository.js"
  - "Mecanismo de validación y auditoría de escaneos láser en tbl_bips_log"
affects: [01-03, phase-2-picking, phase-3-mesa, phase-4-supervisor]

actuals:
  tokens: 2100
  tasks: 3
  commits: 0

tech-stack:
  added: [mysql2/promise, schema.sql]
  patterns: [Repository pattern para persistencia y auditoría de eventos de depósito]

key-files:
  created:
    - c:\WorkSpace\DepSystem\backend-api\src\config\db.js
    - c:\WorkSpace\DepSystem\backend-api\database\schema.sql
    - c:\WorkSpace\DepSystem\backend-api\src\repositories\depositRepository.js
    - c:\WorkSpace\DepSystem\backend-api\tests\test_mysql.js

key-decisions:
  - "Separar claramente los datos comerciales de SGLoja (Firebird) de la telemetría operativa del depósito (MySQL mendes_db)"
  - "Registrar cada escaneo láser en tbl_bips_log (válido o inválido) para auditoría forense ante reclamos de demoras"
  - "Configurar por defecto las 4 mesas físicas (301, 302, 303, 304) y operarios con roles definidos"

patterns-established:
  - "Validación atómica de bips: incremento de cantidad y detección automática de pedido completo"

requirements-completed:
  - DATA-02

coverage:
  - id: D1
    description: "Creación de las 7 tablas de depósito en MySQL mendes_db y pool de conexión"
    requirement: DATA-02
    verification:
      - kind: integration
        ref: "node tests/test_mysql.js"
        status: pass
  - id: D2
    description: "Registro de pedidos reales de Firebird e ítems en MySQL"
    requirement: DATA-02
    verification:
      - kind: integration
        ref: "node tests/test_mysql.js"
        status: pass
  - id: D3
    description: "Auditoría de escaneos láser válidos e inválidos en tbl_bips_log"
    requirement: DATA-02
    verification:
      - kind: integration
        ref: "node tests/test_mysql.js"
        status: pass
---

# Resumen de Ejecución: Plan 01-02

Se implementó y verificó la capa completa de persistencia en MySQL `mendes_db` para la operativa del depósito de Motos Mendes.

## Logros Principales

1. **Esquema Relacional Integral (`schema.sql`):**
   * `tbl_operarios`: Gestión de separadores, guardadores de mesa y supervisores.
   * `tbl_mesas`: Bancadas físicas (Mesas 301, 302, 303, 304) con conteo de pedidos en cola.
   * `tbl_notas_deposito`: Trazabilidad completa del ciclo de vida del pedido en depósito.
   * `tbl_nota_items`: Detalle de repuestos por pedido con cantidades requeridas y bipadas.
   * `tbl_bips_log`: Registro cronológico segundo a segundo de cada escaneo láser.
   * `tbl_pausas_jornada`: Control de pausas globales y por operario.
   * `tbl_configuracion`: Parámetros de turnos laborales.
2. **Repositorio Unificado (`depositRepository.js`):**
   * Métodos para inicialización, consulta de operarios y mesas, registro de pedidos reales provenientes de Firebird, validación de bips láser y asignación de mesas.
3. **Validación E2E Exitosa:**
   * Se ejecutó `test_mysql.js` con el pedido real `38002`, validando la inserción de la nota y sus 21 ítems, la simulación de bips láser correctos y la detección y registro de códigos incorrectos en `tbl_bips_log`.
