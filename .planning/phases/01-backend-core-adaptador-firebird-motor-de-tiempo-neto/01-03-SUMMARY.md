# Resumen de Ejecución: Plan 01-03
## Motor Matemático de Tiempo Neto y API REST Central

- **Fase:** 01-backend-core-adaptador-firebird-motor-de-tiempo-neto
- **Plan:** 03
- **Fecha:** 2026-10-22
- **Estado:** ✅ Completado con Éxito

---

### 1. Objetivos Cumplidos

1. **Motor de Tiempo Neto (`timeEngine.js`):**
   - Implementado cálculo por intervalos exactos descontando:
     - Jornada no laboral nocturna (17:00 a 07:00).
     - Intervalo automático de café matutino (07:00 a 07:15).
     - Pausas maestras de depósito registradas por el supervisor en `tbl_pausas_jornada`.
   - Probado con 4 casos borde en `test_time_engine.js` obteniendo 100% de precisión (incluyendo cruce nocturno de 16:50 a 07:25 = exactamente 20 minutos netos).

2. **Rutas REST Unificadas (`apiRoutes.js`):**
   - `GET /api/status`: Estado del depósito, conteo de pedidos por fase y bandera de pausa global.
   - `POST /api/pausa/toggle-global`: Botón maestro del supervisor para congelar/reanudar el depósito completo.
   - `GET /api/operarios`: Listado de separadores y guardadores activos en `mendes_db`.
   - `GET /api/mesas`: Listado de bancadas físicas (301-304) y estado de cola.
   - `GET /api/pedidos/:num_pedido`: Consulta en tiempo real a Firebird ERP SGLoja y sincronización transparente con `mendes_db`.
   - `GET /api/notas` y `GET /api/notas/:id`: Listado y detalle operativo de pedidos con tiempos formateados en `HH:MM:SS`.
   - `POST /api/picking/iniciar`, `/api/picking/bip`, `/api/picking/finalizar`: Flujo completo de separación con cálculo automático de tiempo neto y entrega a mesa.

3. **Servidor Central (`server.js`) y Verificación:**
   - Servidor Express en puerto 3008 con CORS, JSON parser y manejo centralizado de errores.
   - Verificado con test de integración `tests/test_api_server.js` conectando a Firebird real (pedido 38002 de "TALLER DE MOTOS Y VENTAS DE REPUESTOS M.R" con 21 repuestos) y MySQL `mendes_db`.

---

### 2. Archivos Creados / Modificados
- `backend-api/src/domain/timeEngine.js`
- `backend-api/src/routes/apiRoutes.js`
- `backend-api/server.js`
- `backend-api/tests/test_time_engine.js`
- `backend-api/tests/test_api_server.js`
- `backend-api/src/services/orderService.js` (normalización de `num_pedido` y `num_nota`)

---

### 3. Requerimientos Cubiertos
- **TIME-01:** Exclusión automática del horario fuera de jornada (17:00 a 07:00).
- **TIME-02:** Descuento automático de los 15 minutos del café (07:00 a 07:15).
- **TIME-03:** Soporte para pausas manuales del supervisor (`tbl_pausas_jornada`).
- **TIME-04:** API para consultar tiempo neto acumulado en vivo.
