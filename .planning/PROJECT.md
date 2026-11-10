# DepSystem - Sistema de Depósito & Rendimiento (Motos Mendes)

## What This Is

DepSystem es una suite de tres aplicaciones interconectadas y una API central diseñada para digitalizar, controlar y cronometrar con precisión milimétrica la operativa del depósito central de Motos Mendes S.A. Gestiona el ciclo completo de los pedidos desde la toma y separación (picking) con colectores móviles Android, la entrega a mesas físicas numeradas (ej. Mesa 301) y la revisión/empaque en terminales de PC, hasta el monitoreo en vivo de cuellos de botella y la generación de reportes mensuales de productividad por empleado (segundos por bip y notas procesadas).

## Core Value

Trazabilidad en tiempo real y cálculo exacto del tiempo neto de trabajo por pedido y por empleado sin datos ficticios, conectando directamente con las notas y repuestos reales del ERP Firebird (SGLoja) y descontando automáticamente horarios nocturnos, pausas de café y detenciones de turno.

## Business Context

- **Cliente / Usuarios:** Operarios separadores (picking en pasillos), guardadores/empacadores (en bancadas de mesa), supervisores de depósito y gerencia de operaciones de Motos Mendes S.A.
- **Modelo Operativo:** Aumento de velocidad de despacho, reducción a cero de errores de repuesto mediante escaneo láser obligatorio y cálculo objetivo de bonificaciones por rendimiento mensual.
- **Métrica de Éxito:** Tiempo promedio neto por nota, conteo total de bips registrados y segundos netos por bip por operario.

## Arquitectura de Aplicaciones

El sistema se compone de 3 interfaces especializadas conectadas a un backend único:

1. **`app-picking` (Móvil Android / Colector PDA):**
   * Operación táctil con una sola mano.
   * Escáner láser / barcode con feedback sonoro (Web Audio API) y vibración inmediata.
   * Conteo de bips realizados vs solicitados y asignación a mesas numeradas.
2. **`app-mesa` (Terminal PC de Mesa / Bancada):**
   * Terminal para mesas de control físico (Mesa 301, 302, etc.).
   * Visualización de pedidos en espera, cronómetro de empaque y atajos de teclado sin mouse.
3. **`app-supervisor` (Web Panel de Control & Auditoría):**
   * **Botón Maestro de Pausa/Reanudación:** congela todos los cronómetros del depósito simultáneamente.
   * Semáforo de demoras (> 35 min) y monitor visual Bento Grid de mesas.
   * Reportes mensuales de rendimiento por empleado con auditoría detallada de desvíos.
4. **`backend-api` (Motor de Negocio & Conectividad Dual):**
   * **Adaptador Firebird:** Lee en vivo cabeceras y repuestos reales de pedidos desde `c:\WorkSpace\System\SGLoja\Dados\FB_DADOS.FDB`.
   * **Adaptador MySQL:** Almacena la trazabilidad del depósito, bips, operarios y tiempos en `mendes_db`.
   * **Motor de Tiempo Neto:** Descuenta automáticamente horas nocturnas (17:00 a 07:00) y café matutino (07:00 a 07:15).

## Skills de Diseño e Ingeniería Aplicadas

- **`motos-mendes-visual-identity`:** Rojo oficial `#e60000`, fondos neutros oscuros (`#09090b`), tipografía corporativa **Outfit** e **Inter**.
- **`apple-design`:** Latencia cero en el escáner láser, feedback al presionar (`:active { transform: scale(0.97) }`) y físicas de resorte.
- **`emil-design-eng`:** Microinteracciones fluidas, transiciones `ease-out` y sincronización perceptual entre sonido y barra de progreso.
- **`gpt-taste`:** Bento Grids gapless para el mapa de mesas y tipografía monoespaciada legible a distancia (**JetBrains Mono**).
- **`frontend-mobile-development-component-scaffold`:** Arquitectura de componentes móviles accesibles y reutilizables para Android.
- **`backend-architect` & `backend-security-coder`:** Arquitectura limpia hexagonal, validación estricta de barcodes y trazabilidad auditable.

## Contexto del Ecosistema Motos Mendes

- **ERP Firebird SGLoja:** Ubicado en `c:\WorkSpace\System\SGLoja\Dados\FB_DADOS.FDB`. Tablas: `MOV_RESC` (cabeceras), `MOV_RESI` (ítems), `CAD_PRODUTO`, `V_CAD_CLIENTE`.
- **Base de Datos Depósito MySQL:** `mysql://Rafael:Mendes-1734*@localhost:3306/mendes_db`.
- **Ecosistema de Apps Relacionadas:** `App-venta` (vendedores móviles), `App-Envios` (despacho por transportadoras).

## Constraints

- Cero datos simulados: todos los pedidos y productos leídos en picking deben provenir de la base de datos Firebird real.
- Tolerancia a desconexión y apagado: el cronómetro no debe depender de temporizadores locales del navegador, sino de cálculos matemáticos de timestamps netos en el servidor.
