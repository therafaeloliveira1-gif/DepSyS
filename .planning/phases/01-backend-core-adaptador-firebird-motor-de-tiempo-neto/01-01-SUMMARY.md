---
phase: 01-backend-core-adaptador-firebird-motor-de-tiempo-neto
plan: 01
subsystem: api
tags: [firebird, sgloja, orders, picking, backend]

requires: []
provides:
  - "Adaptador nativo Firebird conectado a FB_DADOS.FDB"
  - "orderService para consulta y normalización de pedidos y repuestos reales"
affects: [01-02, 01-03, phase-2-picking]

actuals:
  tokens: 1850
  tasks: 3
  commits: 0

tech-stack:
  added: [express, cors, dotenv, mysql2, get_firebird_pedido.exe, fbclient.dll]
  patterns: [Adapter pattern para aislamiento de base de datos externa Firebird]

key-files:
  created:
    - c:\WorkSpace\DepSystem\backend-api\package.json
    - c:\WorkSpace\DepSystem\backend-api\bin\get_firebird_pedido.exe
    - c:\WorkSpace\DepSystem\backend-api\bin\fbclient.dll
    - c:\WorkSpace\DepSystem\backend-api\src\adapters\firebirdAdapter.js
    - c:\WorkSpace\DepSystem\backend-api\src\services\orderService.js
    - c:\WorkSpace\DepSystem\backend-api\tests\test_firebird.js

key-decisions:
  - "Utilizar el binario puente nativo con fbclient.dll para conectar directamente con FB_DADOS.FDB en Windows sin requerir ODBC ni dependencias externas"
  - "Normalizar los ítems de Firebird para que el SKU funcione directamente como código de barras del repuesto durante el picking"

patterns-established:
  - "Consulta y normalización segura de pedidos reales: validación de existencia antes de permitir acciones operativas"

requirements-completed:
  - DATA-01
  - DATA-03

coverage:
  - id: D1
    description: "Conexión en vivo con la base de datos Firebird FB_DADOS.FDB de SGLoja"
    requirement: DATA-01
    verification:
      - kind: integration
        ref: "node tests/test_firebird.js"
        status: pass
  - id: D2
    description: "Validación de existencia de pedidos reales y normalización de repuestos"
    requirement: DATA-03
    verification:
      - kind: integration
        ref: "node tests/test_firebird.js"
        status: pass
---

# Resumen de Ejecución: Plan 01-01

Se implementó el adaptador nativo para la base de datos Firebird (`FB_DADOS.FDB`) del sistema ERP SGLoja de Motos Mendes y el servicio de normalización de pedidos `orderService.js`.

## Logros Principales

1. **Cero Datos Ficticios:** Se conectó directamente a la base de datos real en `c:\WorkSpace\System\SGLoja\Dados\FB_DADOS.FDB`.
2. **Extractor Autónomo:** Se configuró el binario puente en `backend-api/bin/` con `fbclient.dll`, garantizando independencia y rendimiento sub-segundo en Windows.
3. **Validación E2E Exitosa:** Se ejecutó `test_firebird.js` consultando el pedido real **38002**, recuperando en ~1 segundo:
   * Cliente real: **TALLER DE MOTOS Y VENTAS DE REPUESTOS M.R** (Código: 2747, YRYBUCUA).
   * **21 repuestos reales** catalogados (Asientos Biz, Guías de válvula, Balancines, Faros LED, etc.) con 758 piezas físicas a separar.
   * Manejo robusto de pedidos inexistentes o sin ítems.
