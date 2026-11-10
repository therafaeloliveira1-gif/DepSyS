# Roadmap: DepSystem (Motos Mendes)

## Overview

Desarrollo estructurado en 6 fases para construir el ecosistema de depósito de Motos Mendes: desde la capa de datos dual (lectura en vivo de Firebird SGLoja y persistencia operativa en MySQL `mendes_db`), pasando por las interfaces especializadas (Móvil Separador, PC Mesa y Web Supervisor), hasta los reportes mensuales de rendimiento y validación final en depósito.

## Phases

- [x] **Phase 1: Backend Core, Adaptador Firebird & Motor de Tiempo Neto** - Conexión directa a SGLoja, tablas en `mendes_db` y algoritmo de exclusión de horarios no laborales.
- [x] **Phase 2: App 1 - Separador Móvil (Picking & Bips Láser)** - Interfaz Android táctil de alta velocidad, escaneo láser con feedback sonoro y entrega a mesa.
- [x] **Phase 3: App 2 - Terminal PC de Mesa / Bancada** - Terminal de control para mesas físicas (Mesa 301, 302), cronómetro de empaque y atajos de teclado.
- [x] **Phase 4: App 3 - Supervisor Central, Control de Turnos & Semáforo** - Botón maestro de pausa, mapa de mesas Bento Grid y alertas de demoras (> 35 min).
- [x] **Phase 5: Módulo de Reportes & KPIs Mensuales de Rendimiento** - Métricas por empleado (segundos/bip, notas procesadas) y auditoría detallada por pedido.
- [x] **Phase 8: Faltantes (Botón "No Hay") y Reporte de Discrepancias** - Consulta pura SELECT en Firebird, registro en MySQL, alertas físicas y reporte semanal.
- [x] **Phase 9: Unificación de Terminales Web DepSyS (Fusión de app-mesa en app-depsys basada en Roles)** - Front-end unificado en puerto 3003 con renderizado dinámico por rol (bancada de trabajo exclusiva para guardadores, distribución para expedición y monitor panorámico para supervisores).
- [x] **Phase 10: Anclaje de Bancada por Hardware / PC (Cero Configuración Manual)** - Identificador fijo de terminal por configuración en Personal y Seguridad (`tbl_operarios.mesa_codigo`), asignación directa al iniciar sesión y soporte para ejecutable desktop nativo.
- [ ] **Phase 11: Rediseño Kiosko Industrial de la Terminal de Mesa** - Interfaz de pantalla completa, números gigantes para lectura a distancia, escaneo láser obligatorio sin mouse y feedback sonoro nativo.
- [ ] **Phase 12: Consolidación del Centro de Control de Supervisión** - Fusión de las 9 pantallas en 2 vistas clave: Asignación de Flujo Activo y Bandeja Unificada de Excepciones (Demoras + Esperas + Discrepancias).
- [ ] **Phase 13: Empaquetado Desktop Nativo (.exe / Windows Installer)** - Construcción de instaladores Windows (.exe / .msi) con Tauri v2 y WebView2 nativo para terminales PC del depósito.
- [ ] **Phase 14: Impresión Térmica Directa al Finalizar** - Disparo automático de remito/rótulo de bulto hacia impresora térmica USB/Red (ESC/POS / Zebra) al pulsar Enter en mesa.

---

## Phase Details

### Phase 1: Backend Core, Adaptador Firebird & Motor de Tiempo Neto
**Goal**: Establecer la arquitectura base del backend que lee pedidos reales desde Firebird (`FB_DADOS.FDB`), persiste estados en MySQL (`mendes_db`) y calcula tiempos netos excluyendo noche y café.  
**Depends on**: Nothing (primera fase)  
**Requirements**: DATA-01, DATA-02, DATA-03, TIME-01, TIME-02, TIME-03, TIME-04  
**Success Criteria**:
  1. El endpoint `GET /api/pedidos/:num_pedido` consulta la base de datos real Firebird y retorna los repuestos, cantidades y cliente en menos de 500ms.
  2. Las tablas de `mendes_db` registran operarios, mesas, bips y pausas de forma íntegra.
  3. El cálculo de tiempo entre las 16:50 y las 07:25 del día siguiente descuenta automáticamente la noche y los 15 minutos del café, dando exactamente 20 minutos netos.
**Plans**: 3 planes
- [x] 01-01: Adaptador Firebird para lectura de pedidos reales de SGLoja (`get_firebird_pedido.exe` / módulo puente).
- [x] 01-02: Esquema MySQL en `mendes_db` para operarios, mesas, auditoría de bips y pausas.
- [x] 01-03: Motor matemático de tiempo neto con exclusión de turno nocturno y descansos de café.

### Phase 2: App 1 - Separador Móvil (Picking & Bips Láser)
**Goal**: Crear la aplicación móvil Android optimizada para colectores de datos con escáner láser, validación de repuestos y feedback auditivo instantáneo.  
**Depends on**: Phase 1  
**Requirements**: PICK-01, PICK-02, PICK-03, PICK-04, PICK-05, PICK-06, PICK-07  
**Success Criteria**:
  1. El separador selecciona su usuario y visualiza la lista de pedidos pendientes de SGLoja.
  2. Al escanear un código de barras correcto, la interfaz emite un tono agudo y actualiza el contador de piezas en menos de 100ms.
  3. Al escanear un código incorrecto, la pantalla vibra y emite un tono grave de advertencia.
  4. Al completar el 100% de los repuestos, se activa el modal de entrega a mesa (Mesa 301, 302, etc.) y se detiene el cronómetro de picking.
**Plans**: 3 planes
- [x] 02-01: Shell móvil táctico con `motos-mendes-visual-identity` y `frontend-mobile-development-component-scaffold`.
- [x] 02-02: Módulo de escaneo láser, Web Audio API y contador de bips en tiempo real.
- [x] 02-03: Flujo de selección y entrega a mesa con cierre de tiempo de separación.

### Phase 3: App 2 - Terminal PC de Mesa / Bancada
**Goal**: Desarrollar la interfaz de escritorio para las mesas físicas del depósito enfocada en la verificación de repuestos y empaque final.  
**Depends on**: Phase 1, Phase 2  
**Requirements**: MESA-01, MESA-02, MESA-03, MESA-04, MESA-05, MESA-06  
**Success Criteria**:
  1. La PC de la mesa se configura automáticamente con su número asignado (ej. Mesa 301).
  2. Muestra la cola de notas que los separadores dejaron en esa mesa.
  3. El guardador puede iniciar y finalizar la revisión con atajos de teclado sin requerir mouse.
  4. Al finalizar, la nota queda en estado `FINALIZADO` con los tiempos netos consolidados.
**Plans**: 2 planes
- [x] 03-01: Terminal de mesa de dos columnas (cola de pedidos y checklist de empaque).
- [x] 03-02: Cronómetro de mesa y flujo de finalización de pedido para despacho.

### Phase 4: App 3 - Supervisor Central, Control de Turnos & Semáforo
**Goal**: Implementar el panel de control en tiempo real para el encargado del depósito con botón maestro de pausa y semáforo de demoras.  
**Depends on**: Phase 1, Phase 2, Phase 3  
**Requirements**: SUPV-01, SUPV-02, SUPV-03, SUPV-04  
**Success Criteria**:
  1. El supervisor puede pausar el depósito completo con un botón; todos los cronómetros se congelan inmediatamente.
  2. Los pedidos con más de 35 minutos de separación se destacan con alerta roja de demora excesiva.
  3. El monitor Bento Grid muestra la carga de trabajo y disponibilidad de cada mesa en tiempo real.
**Plans**: 2 planes
- [x] 04-01: Barra maestra de control de turno y botón de pausa global con confirmación.
- [x] 04-02: Semáforo Kanban en tiempo real y mapa de calor de mesas.

### Phase 5: Módulo de Reportes & KPIs Mensuales de Rendimiento
**Goal**: Producir las herramientas de auditoría y reportes mensuales de productividad para evaluar a los empleados y liquidar incentivos.  
**Depends on**: Phase 4  
**Requirements**: REPO-01, REPO-02, REPO-03, REPO-04  
**Success Criteria**:
  1. Tabla de rendimiento mensual de separadores con columnas de notas, piezas, bips y el KPI de segundos por bip.
  2. Ficha de auditoría 360° por nota que detalla el historial segundo a segundo de cada bip escaneado.
  3. Exportación limpia de métricas a formato tabular.
**Plans**: 2 planes
- [x] 05-01: Generador de KPIs y tablas de rendimiento mensual por empleado.
- [x] 05-02: Visor de auditoría forense por nota y exportador de datos.

### Phase 6: Integración E2E, Pruebas en Depósito & Despliegue
**Goal**: Poner a punto el sistema completo con lectores láser físicos en el depósito de Motos Mendes y generar los ejecutables de inicio rápido.  
**Depends on**: Phase 1 to Phase 5  
**Success Criteria**:
  1. Ejecución de un ciclo completo de picking, entrega a Mesa 301 y empaque con datos reales de Firebird.
  2. Verificación de cálculo correcto tras dejar un pedido abierto durante el cambio de jornada.
  3. Creación de los scripts de lanzamiento en un clic (`INICIAR-DEPOSITO.bat`).
**Plans**: 2 planes
- [x] 06-01: Validación de hardware con colectores Android físicos y lectores láser.
- [x] 06-02: Scripts de empaquetado y puesta en producción local.

### Phase 7: Fundación DepSystem (Flujo Nelson, Confirmación & Tiempos Operativos)
**Goal**: Implementar el ciclo operativo exacto acordado con los encargados (reloj picking inmediato al asignar, sugerencia por separador, confirmación por supervisor, tercer reloj de espera, descuentos automáticos de almuerzo/café y retiro en mostrador).
- [x] 07-01: Motor horario con jornada 07:15–17:00, almuerzo 11:30–13:00, café 15:30–15:45 y horas extras configurables.
- [x] 07-02: Estados `ESPERA_CONFIRMACION` y `ASIGNADO_MESA`, tabla `tbl_estados_historial`, semáforo de cargas en mesas.
- [x] 07-03: Bandeja de supervisores para confirmación de mesas con alerta de cuello de botella (> 3 min).

### Phase 8: Faltantes (Botón "No Hay") y Reporte de Discrepancias
**Goal**: Gestionar el flujo de productos no encontrados en estante con **lectura pura de Firebird ERP (100% SELECT, CERO escrituras)**, registro de discrepancias en MySQL, continuidad del reloj de picking, alertas de verificación física si hay stock teórico, aprobación de cierre parcial sin penalización al separador y detección de faltantes recurrentes (≥ 3 en 7 días).
**Depends on**: Phase 7
**Success Criteria**:
  1. El servidor Firebird es consultado exclusivamente mediante sentencias `SELECT` de solo lectura (`firebirdStockAdapter.js`), garantizando que jamás se ejecute ningún INSERT, UPDATE, DELETE o POST en el ERP.
  2. El separador puede presionar "No Hay" en cualquier ítem no completado desde `app-picking`; el reloj continúa corriendo normalmente.
  3. Si Firebird reporta stock teórico > 0, se genera una alerta inmediata de verificación física para el supervisor.
  4. El supervisor dispone del panel `DiscrepanciesPanel` para "Confirmar Falta (Aprobar Cierre Parcial)" o indicar "Hallado en Depósito".
  5. Las notas con faltantes aprobados permiten entrega a mesa con cierre parcial sin penalizar tiempos del separador.
  6. Se detectan y alertan los artículos con 3 o más faltantes reportados en la última semana para el Supervisor Maestro (Marcos).
- [x] 08-01: Adaptador Firebird de solo lectura (`consultarStockTeoricoFirebird`) y tabla MySQL `tbl_discrepancias_stock`.
- [x] 08-02: Endpoints backend en `apiRoutes.js` (`/api/picking/reportar-faltante`, `/api/discrepancias`, `/api/discrepancias/:id/resolver`, `/api/discrepancias/recurrentes-semana`).
- [x] 08-03: Interfaz móvil `app-picking` con botón "No Hay", modal de confirmación rápida, indicador de faltante y entrega con cierre parcial.
- [x] 08-04: Panel `DiscrepanciesPanel` en `app-supervisor`, alerta de stock en ERP vs físico, resolución y reporte semanal recurrente.
- [x] 08-05: Suite de pruebas automatizadas `test_discrepancias_fase8.js` y APK firmado actualizado.

### Phase 9: Unificación de Terminales Web DepSyS (Fusión de `app-mesa` en `app-depsys` basada en Roles)
**Goal**: Eliminar la duplicación de frontends unificando `app-mesa` y `app-supervisor` en una sola aplicación web maestro (`app-depsys`), donde el rol/PIN del usuario determina su vista exclusiva: los guardadores operan la verificación y empaque de su bancada (bips láser y checklist), el distribuidor gestiona la asignación de pedidos a recolectores, y el supervisor accede al control integral.
**Depends on**: Phase 8
**Success Criteria**:
  1. Componentes de verificación física de `app-mesa` (`ReviewChecklistPanel`, `TableQueuePanel`, `OrderFinishedSuccessModal`, `TableConfigModal`) integrados en el frontend unificado.
  2. Cuando un guardador (ej. `GRD301`) inicia sesión, su pantalla muestra directamente la terminal de trabajo de su bancada asignada con bipeo de ítems, empaque y pedido de confirmación, sin barras de navegación ajenas.
  3. Soporte para selección y persistencia de número de bancada física (301 a 319) por terminal.
  4. Los supervisores (`SUP008`, `ADMIN`, `SUPERVISOR`) mantienen tanto el monitor panorámico de bancadas como la capacidad de auditar cualquier mesa.
  5. Actualización de scripts de arranque (`INICIAR-DEPOSITO.bat`) eliminando el servidor redundante de `app-mesa`.
  6. Compilación de producción exitosa sin errores.
**Plans**: 3 planes
- [x] 09-01: Migración e integración de componentes operativos de mesa (`ReviewChecklistPanel`, `TableQueuePanel`, `TableConfigModal`) al frontend unificado.
- [x] 09-02: Enrutamiento dinámico y persistencia de bancada física por terminal según permisos del guardador.
- [x] 09-03: Actualización de scripts operativos (`INICIAR-DEPOSITO.bat`), build de producción y validación en navegador.

### Phase 10: Anclaje de Bancada por Hardware / PC (Cero Configuración Manual)
**Goal**: Eliminar la dependencia de `localStorage` para la mesa física, creando un sistema de anclaje local persistente por equipo (`depsys.config.json` o flags de inicio) para que cada PC de bancada (301 a 319) recuerde su identidad de máquina de forma inmutable.
**Depends on**: Phase 9
**Success Criteria**:
  1. Archivo de configuración local de máquina (`depsys.config.json` / variable de entorno de terminal) leído en el arranque nativo.
  2. Si la PC está configurada como Mesa 304, cualquier guardador que ingrese su PIN queda anclado a la Mesa 304 automáticamente.
  3. Soporte para modo `--mode=mesa --id=304` y fallback transparente si corre en modo supervisor.
**Plans**: 2 planes
- [x] 10-01: Selector de Bancada de Empaque asignada (Mesas 301 a 319) dentro de Personal y Seguridad.
- [x] 10-02: Persistencia en MySQL (`tbl_operarios.mesa_codigo`) y asignación automática al autenticarse en la app desktop.

### Phase 11: Rediseño Kiosko Industrial de la Terminal de Mesa
**Goal**: Transformar la interfaz de mesa en un Kiosko Industrial de alta velocidad ergonómica: pantalla completa forzada, códigos y cantidades a gran escala para lectura a 2 metros, escaneo láser obligatorio sin mouse y feedback sonoro nativo.
**Depends on**: Phase 10
**Success Criteria**:
  1. Eliminación total de elementos de navegación, menús superiores y barras de supervisor en modo mesa.
  2. Tipografía a gran escala para SKU (24px+) y cantidad de piezas (36px+ bold) visible a distancia.
  3. Validación de repuesto por pistola de código de barras con feedback acústico inmediato (tono agudo OK / buzzer error).
  4. Flujo 100% operable por teclado: Espacio para pausar/reanudar, Enter para finalizar y despachar.
**Plans**: 2 planes
- [x] 11-01: Layout Kiosko de alto contraste y tipografía industrial para la terminal de empaque.
- [x] 11-02: Motor de bipeo láser estricto y atajos de teclado sin ratón.

### Phase 12: Consolidación del Centro de Control de Supervisión
**Goal**: Reducir la sobrecarga cognitiva del supervisor fusionando las 9 pantallas actuales en 2 vistas de alto impacto: Asignación de Flujo Activo y Bandeja Unificada de Excepciones (Demoras + Esperas + Discrepancias).
**Depends on**: Phase 11
**Success Criteria**:
  1. Panel principal consolidado: Flujo de pedidos en tiempo real con asignación rápida a separador y mesa sugerida.
  2. Bandeja única de excepciones que agrupa alertas de demoras (>35m), confirmaciones de mesa en espera y faltantes de stock ("No Hay").
  3. Menú secundario simplificado para Administración (Personal, PINs y Reportes).
**Plans**: 2 planes
- [x] 12-01: Rediseño del Centro de Mando del Supervisor con bandeja unificada de excepciones.
- [x] 12-02: Optimización del flujo de asignación de pedidos a recolectores y bancadas.

### Phase 13: Empaquetado Desktop Nativo (.exe / Windows Installer)
**Goal**: Configurar el pipeline de empaquetado final con Tauri v2 para generar instaladores Windows (`.exe` / `.msi`) ligeros (~10 MB) para distribución en las PCs del depósito.
**Depends on**: Phase 12
**Success Criteria**:
  1. Ejecutable `depsys-desktop.exe` optimizado en modo release con consumo < 50 MB de memoria RAM.
  2. Generación del instalador Windows mediante `npm run desktop:build` / `COMPILAR-DESKTOP.bat`.
  3. Accesos directos de escritorio preconfigurados para mesas de empaque y supervisor.
**Plans**: 2 planes
- [x] 13-01: Configuración de bundling, iconos y capacidades nativas en `tauri.conf.json`.
- [x] 13-02: Generación del instalador Windows (.msi / setup.exe) y verificación de arranque limpio.

### Phase 14: Impresión Térmica Directa al Finalizar
**Goal**: Automatizar la emisión física de remitos y rótulos de bulto enviando comandos directos a la impresora térmica de la mesa de empaque al pulsar Enter.
**Depends on**: Phase 13
**Success Criteria**:
  1. Detección y envío directo a impresoras térmicas USB/Red (ESC/POS / Zebra ZPL/EPL).
  2. Emisión de etiqueta con número de pedido, cliente, destino, recolector y bultos al finalizar empaque.
**Plans**: 2 planes
- [x] 14-01: Módulo nativo o servicio de impresión térmica para remitos y etiquetas de bulto.
- [x] 14-02: Disparo automático de impresión al cerrar la nota en terminal de mesa.

