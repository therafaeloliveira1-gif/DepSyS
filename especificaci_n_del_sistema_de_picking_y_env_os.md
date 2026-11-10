# Especificación Funcional: Ecosistema de Picking, Mesa y Envíos

Este documento consolida y estructura los requerimientos operativos, flujos de trabajo, gestión de excepciones y la arquitectura de datos para el ecosistema de aplicaciones de almacén.

---

## 1. Arquitectura General y Ecosistema de Datos

El sistema se fundamenta en una **base de datos única y centralizada**, evitando integraciones complejas de sincronización punto a punto.

* **Base de Datos Unificada:** Todas las aplicaciones (Picking, Mesa, Supervisión y Envíos) leen y escriben en el mismo modelo de datos.
* **Transición por Estados:** El flujo de una nota/pedido se gestiona mediante el cambio de estados en la entidad `Nota` o `Pedido`.
* **Métricas de Rendimiento:** Registro de marcas de tiempo (*timestamps*) independientes para calcular el tiempo neto de cada etapa operativa.

```
[ App Picking ] ──┐
[ App Mesa ]    ──┼──> [ BASE DE DATOS CENTRAL ] <─── [ App Envíos (Nueva) ]
[ Panel Sup. ]  ──┘
```

---

## 2. Flujo Operativo Principal

### Etapa 1: Picking (Separador)
1. **Asignación:** El supervisor asigna la nota a un separador específico desde el panel (visualizando separadores libres).
2. **Inicio Inmediato del Cronómetro:** El tiempo de recolección **comienza a correr inmediatamente al ser asignada** por el supervisor (no requiere botón de aceptar/iniciar). La nota aparece abierta directamente en el colector/dispositivo del separador.
3. **Escaneo Láser:** Escaneo obligatorio pieza por pieza con lector láser (sonido y registro de error en caso de SKU equivocado).
4. **Finalización:** Al terminar la recolección física:
   * El separador pulsa "Finalizar" y **elige la mesa de destino como sugerencia**.
   * Se detiene el cronómetro de picking.
   * La mercadería se traslada físicamente al área de mesas.
   * La nota cambia de estado a: `ESPERA_CONFIRMACION` (con la mesa sugerida registrada).
   * Comienza a correr el **tercer cronómetro** (tiempo de espera de confirmación de supervisor).

### Etapa 2: Confirmación del Supervisor
1. **Notificación y Semáforo de Espera:** El supervisor visualiza las notas finalizadas por los separadores con su mesa sugerida y la carga actual de cada mesa (verde 0–1, naranja 2–4, rojo >4 notas).
2. **Alerta de Demora:** Si la confirmación supera 3 a 5 minutos, el sistema emite alerta visual y sonido de atención.
3. **Confirmación:** El supervisor confirma la mesa sugerida (o la cambia) y la nota pasa a `ASIGNADO_MESA`.
4. **Ingreso a Mesa:** Entra en la **lista de espera de esa mesa** (en pausa, sin cronómetro de mesa activo).

### Etapa 3: Mesa de Control y Empaque
1. **Recepción en Mesa:** La nota aparece disponible en el terminal/pantalla de la mesa asignada.
2. **Activación Condicional del Cronómetro:**
   * El tiempo **no** comienza al recibir la nota.
   * El cronómetro se activa automáticamente cuando el operador escanea el **primer producto**.
3. **Devolución por Error:** Si el conferencista detecta un error de separación, lo marca en pantalla. El reloj de mesa **NO** se pausa; se activa un **tiempo de error** atribuido al separador y la nota regresa a él para subsanar. Al subsanar, vuelve a la misma mesa sin requerir nueva confirmación de supervisor.
4. **Cierre de Empaque:** El operador valida la totalidad de los ítems y confirma el cierre del paquete.
5. **Cierre de Ciclo:**
   * Si es **Mostrador / Retiro Local:** pasa a `RETIRADO_MOSTRADOR` (entrega directa al cliente, no pasa por envíos).
   * Si es **Envío / Transportadora:** pasa a `LISTO_PARA_ENVIO`.

### Etapa 4: Despacho y Envíos
1. **Nueva App de Envíos (PC):** Permanece abierta en el puesto de despacho.
2. **Recepción Automática:** Al confirmarse en mesa, la nota pasa inmediatamente a la cola de despacho.
3. **Carga y Verificación 100%:** Escaneo de código de barras de cada bulto al subir al camión (ej. 5 bultos, si bipa 4 marca error).
4. **Consolidación y Salida:** Finalización de salida física y cambio a `ENVIADO`.

---

## 3. Flujo de Excepciones: Quiebre de Stock (Faltantes)

Cuando hay discrepancia entre el inventario teórico del sistema y las existencias físicas en el depósito:

```
[Separador reporta "No Hay"] (El reloj de picking sigue corriendo)
            │
            ▼
[Sistema consulta Stock Teórico en BD (PRD_QTDE)]
            │
      ┌─────┴─────────────────────────┐
      ▼                               ▼
[Stock teórico > 0]             [Sin stock en BD]
Alerta urgente a Supervisor       Supervisor confirma falta
para verificación física góndola  y aprueba cierre parcial
      │                               │
      ├─► Sí existe: se ubica         └─► Nota cierra parcial
      │   y continúa el picking           Faltante va a Reporte
      │                                   de Discrepancias
```

---

## 4. Matriz de Estados de la Nota

| Estado | Aplicación Activa | Cronómetro | Acción para Siguiente Estado |
| :--- | :--- | :--- | :--- |
| `EN_PICKING` | App Picking | **Activo** (Picking) desde asignación | Separador presiona "Finalizar" y sugiere mesa |
| `ESPERA_CONFIRMACION` | Panel Supervisor | Detenido picking / **Activo** tercer reloj (Espera Confirmación) | Supervisor confirma la mesa sugerida o la cambia |
| `ASIGNADO_MESA` | App Mesa (cola de la mesa) | Pausado | Operador escanea el primer producto con lector |
| `EN_EMPAQUE` | App Mesa | **Activo** (Mesa) | Operador completa y confirma empaque |
| `ERROR_SEPARACION` | App Picking / Mesa | Reloj mesa activo / **Activo** reloj de error separador | Separador corrige producto errado |
| `RETIRADO_MOSTRADOR` | App Mesa / Mostrador | Detenido | Entrega presencial directa a cliente en sucursal |
| `LISTO_PARA_ENVIO` | App Envíos | Pausado | Despachador escanea bultos para camión |
| `ENVIADO` | App Envíos | Detenido | Ciclo completado y despachado |

---

## 5. Próximos Pasos Técnicos Sugeridos

1. **Diseño del Esquema de Datos:** Definir tablas relacionales (`notas`, `items_nota`, `estados_historial`, `usuarios_mesa`, `discrepancias_stock`).
2. **WebSockets / Eventos en Tiempo Real:** Configurar suscripciones a cambios de estado para que las aplicaciones de Picking, Mesa y Supervisión actualicen sus listas sin recargar la pantalla.
3. **Módulo de Notificaciones:** Implementar alertas push o avisos directos para la resolución rápida de productos faltantes.