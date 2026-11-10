# Requirements: DepSystem

**Defined:** 2026-10-22  
**Core Value:** Trazabilidad en tiempo real y cálculo exacto del tiempo neto de trabajo por pedido y por empleado sin datos ficticios, conectando directamente con las notas y repuestos reales del ERP Firebird (SGLoja).

## v1 Requirements

### Conexión de Datos Reales & Persistencia (DATA)

- [x] **DATA-01**: El backend se conecta en vivo a la base de datos Firebird `c:\WorkSpace\System\SGLoja\Dados\FB_DADOS.FDB` para extraer pedidos (`MOV_RESC`), repuestos solicitados (`MOV_RESI`) y datos de clientes.
- [x] **DATA-02**: El backend persiste en MySQL `mendes_db` los operarios, las mesas físicas, el log de cada bip escaneado, los tiempos netos calculados y los estados de pedidos en depósito.
- [x] **DATA-03**: El sistema valida que el número de nota o pedido escaneado exista en SGLoja antes de habilitar el picking.

### Motor de Tiempo Neto & Jornada (TIME)

- [x] **TIME-01**: El servidor calcula el tiempo neto efectivo entre el inicio y fin de una tarea, descontando automáticamente el horario no laboral nocturno (17:00 a 07:00).
- [x] **TIME-02**: El servidor descuenta automáticamente la pausa del café matutino (15 minutos, de 07:00 a 07:15).
- [x] **TIME-03**: El supervisor puede accionar una pausa maestra global que congela el cómputo de tiempo de todas las notas en curso simultáneamente.
- [x] **TIME-04**: El sistema almacena intervalos de pausa para permitir auditoría exacta ante reclamos de tiempo.

### App 1: Separador Móvil (PICK)

- [x] **PICK-01**: El separador selecciona su usuario mediante acceso rápido en la pantalla móvil.
- [x] **PICK-02**: El separador escanea el código de barras del pedido o lo selecciona de la lista de pendientes; el sistema registra el inicio de separación (*timestamp*).
- [x] **PICK-03**: El operario escanea cada producto con el lector láser; el sistema valida el código de barras contra la lista de repuestos de la nota de Firebird.
- [x] **PICK-04**: El sistema emite feedback sonoro inmediato mediante Web Audio API (tono agudo en acierto, tono grave en error de repuesto).
- [x] **PICK-05**: El sistema contabiliza el número total de bips realizados e incrementa el contador de piezas del ítem.
- [x] **PICK-06**: Al completar el 100% de las piezas, el sistema activa la entrega y permite seleccionar la mesa numerada de destino (ej. Mesa 301).
- [x] **PICK-07**: El sistema detiene el cronómetro de picking y actualiza el estado de la nota a `EN_MESA`.

### App 2: Terminal PC de Mesa / Bancada (MESA)

- [x] **MESA-01**: La terminal de PC permite configurar su mesa física por defecto (ej. Mesa 301, 302, etc.).
- [x] **MESA-02**: Muestra en tiempo real la cola de pedidos esperando revisión en esa mesa específica.
- [x] **MESA-03**: El guardador inicia la revisión del pedido con un clic o presionando la barra espaciadora; arranca el cronómetro de mesa.
- [x] **MESA-04**: Muestra la lista de repuestos para verificación visual y control de empaque.
- [x] **MESA-05**: El guardador finaliza la revisión; el sistema calcula el tiempo neto de mesa y el tiempo total del ciclo (Picking + Mesa).
- [x] **MESA-06**: El pedido cambia su estado a `FINALIZADO` (Listo para despacho).

### App 3: Panel de Supervisor & Semáforo (SUPV)

- [x] **SUPV-01**: Botón maestro de un toque para pausar o reanudar la jornada completa del depósito.
- [x] **SUPV-02**: Indicador visible del estado de jornada (`🟢 OPERANDO` / `⏸️ EN PAUSA`).
- [x] **SUPV-03**: Semáforo de demoras en tiempo real: marca en rojo intermitente cualquier pedido que supere el umbral configurado (> 35 min).
- [x] **SUPV-04**: Monitor visual tipo Bento Grid con el estado de ocupación de cada mesa (disponible, con notas en cola, en revisión).

### Módulo de Reportes & KPIs Mensuales (REPO)

- [x] **REPO-01**: Reporte mensual de separadores: total de notas procesadas, total de piezas separadas, tiempo promedio neto por nota y segundos promedio por bip.
- [x] **REPO-02**: Reporte mensual de guardadores / mesas: notas revisadas y tiempo promedio de empaque.
- [x] **REPO-03**: Ficha de auditoría detallada por pedido: desglose de tiempos (picking vs mesa), identificación de operarios y registro cronológico de cada bip escaneado.
- [x] **REPO-04**: Exportación de reportes a formato tabular / Excel para liquidación de bonificaciones.

## Out of Scope

| Característica | Razón |
|---|---|
| Modificación de stock en Firebird | DepSystem solo audita y controla el flujo operativo y tiempos; el stock se descuenta en SGLoja al facturar. |
| Gestión de cobros y facturación | Corresponde exclusivamente al sistema administrativo SGLoja. |
| Módulo de liquidación salarial | DepSystem provee las métricas (segundos/bip, notas); la liquidación se realiza en el sistema contable. |

## Traceability

| Requerimiento | Fase Roadmap | Estado |
|---|---|---|
| DATA-01, DATA-02, DATA-03 | Fase 1 | Completado |
| TIME-01, TIME-02, TIME-03, TIME-04 | Fase 1 | Completado |
| PICK-01, PICK-02, PICK-03, PICK-04, PICK-05, PICK-06, PICK-07 | Fase 2 | Completado |
| MESA-01, MESA-02, MESA-03, MESA-04, MESA-05, MESA-06 | Fase 3 | Completado |
| SUPV-01, SUPV-02, SUPV-03, SUPV-04 | Fase 4 | Completado |
| REPO-01, REPO-02, REPO-03, REPO-04 | Fase 5 | Completado |
