# DECISIONES DEFINITIVAS — DepSystem (examen + audio del encargado)

Fuente: [EXAMEN-DEFINICIONES.md](EXAMEN-DEFINICIONES.md) respondido + transcripción del audio.
Estado: **pendiente de confirmar los puntos de la sección 12 antes de implementar.**

## 1. Jornada y relojes
| Tramo | Horario |
|---|---|
| Entrada (va directo al café) | 07:00 |
| Inicio del cronómetro de trabajo | **07:15** |
| Almuerzo | 11:30 – 13:00 |
| Café de la tarde | 15:30 – 15:45 |
| Fin de turno (sin hora extra) | 17:00 |

- Sin hora extra: la nota queda abierta a nombre del separador y retoma al día siguiente 07:15. El tiempo nocturno se descuenta solo.
- Solo cuenta el horario trabajado.
- **Pausa maestra del supervisor** = única pausa manual. No hay pausa individual.
- Los descansos fijos son descuentos automáticos; la pausa maestra cubre paradas ad-hoc (sin doble conteo).

## 2. Asignación (Picking)
- **Siempre asigna un supervisor** (el separador nunca elige libremente).
- **La asignación inicia el reloj de inmediato.** No hay paso "aceptar/iniciar". La nota aparece abierta/pendiente en el dispositivo del separador.
- El supervisor necesita un panel con separadores libres.
- Un separador = una nota a la vez, **salvo varias notas del mismo cliente**.

## 3. Escaneo en picking
- Escaneo obligatorio por pieza. Excepciones: producto sin código de barras o código errado (a estudiar).
- Escaneo equivocado → sonido de error + **registro para auditoría** (detecta también código mal cargado en catálogo).

## 4. Confirmación del supervisor
- Al terminar, el separador **sugiere mesa** → estado `ESPERA_CONFIRMACION` → supervisor confirma o cambia → `ASIGNADO_MESA` (lista de espera de la mesa, en pausa).
- Quien confirma en la práctica: **Nelson** (encargado de mesas). Cualquier supervisor puede.
- Sin login extra al confirmar (la sesión ya identifica al usuario). **Necesita login de supervisor.**
- El supervisor **no puede rechazar**.
- Ve: nº de nota, cliente, separador y tiempo, cantidad de piezas, mesa sugerida, **carga actual por mesa**, notas en espera.
- Colores de carga por mesa: verde 0–1, naranja 2–4, rojo >4.
- Demora: alerta de color + **sonido** a los ~3–5 min.
- Tiempo de espera de confirmación = **tercer cronómetro** (detecta cuellos de botella).

## 5. Mesa de empaque
- Un operador por mesa (conferencista, usa la PC). Cola de varias notas, una activa a la vez.
- Escaneo láser de cada producto. **El primer escaneo inicia el reloj de mesa.**
- Caja llevada físicamente por el separador.

## 6. Error detectado en mesa
- Se corrige marcando el error en la app → aviso al separador que lo armó.
- Reloj de picking del separador **se pausa** y corre un **"tiempo de error"** hasta resolver; se atribuye al separador.
- La nota vuelve al separador para corregir.

## 7. Faltantes
- Botón **"No hay"** del separador → aviso al supervisor. **El reloj sigue corriendo.**
- Supervisor ve "sistema dice 11, pedido pide 10", verifica físico y responde sí/no.
- Si existe: se localiza (quién busca: por definir). Si no: **cierre parcial** y el faltante va al reporte de discrepancias.
- Faltantes aprobados **nunca penalizan** al separador.

## 8. Reportes y premios
- Reporte de discrepancias: lo lee el **supervisor maestro (Marcos)**, solo cuando hay problema.
- Alerta de producto con faltantes **repetidos** (ej. 3/semana).
- Premio mensual: criterio **abierto** (ya existe incentivo).
- Descuento por errores de mesa: **decide la gerencia**.
- **Sin ranking en pantalla del operario.** Se quiere una **5ª app de pantallas** para la oficina (espejo en vivo: quién está sin nota, cuánto tiempo).

## 9. Envíos
- App de envíos en **PC**, queda **abierta** (se sigue usando la actual mientras tanto).
- Carga del camión: **escaneo de código de barras de cada bulto** (control 100%).
- Datos del despachador: cliente, dirección, teléfono, transportadora, cantidad de bultos.
- Impresión de etiqueta en cada mesa, impresora **genérica** (no atada a Zebra).
- Sin cuarto cronómetro para el despachador.
- Retiro en mostrador: sin envío, mesa → "Entregado en mostrador", **siempre con prioridad** sobre envíos.

## 10. Infraestructura
- **Modo offline obligatorio**: el colector guarda bips y sincroniza al llegar al Wi-Fi fuerte.
- Servidor siempre encendido; backup a definir (sugerido: copia a segundo disco).
- Acceso remoto del supervisor: posible vía API/VPN.
- Entrada de hardware agnóstica (cualquier lector, cualquier impresora).
- SGLoja: **solo lectura**.

## 11. Prioridades y pruebas
Orden pedido: 1) faltantes + reporte, 2) offline, 3) devolución mesa→picking, 4) flujo de confirmación, 5) app de envíos.
Pruebas: **simulación con datos reales** (venta real, todo el proceso, sin emitir factura fiscal, con envío).

## 12. Puntos confirmados por el usuario
1. **Descuentos automáticos:** Almuerzo (11:30–13:00) y café (15:30–15:45) se descuentan solos automáticamente. La pausa maestra del supervisor cubre paradas manuales ad-hoc sin doble conteo.
2. **Devolución de mesa a picking:** El reloj de mesa **NO se pausa**. Corre el "tiempo de error" del separador.
3. **Retorno de la nota devuelta:** La nota vuelve a la **misma mesa** directamente, **no necesita nueva confirmación** del supervisor.
4. **Habilitación de hora extra:** El supervisor maestro decide y marca en el sistema qué separadores **NO** harán hora extra (para pausar automáticamente sus tiempos a las 17:00). Los que sí hacen hora extra continúan con su reloj corriendo.
5. **Notas agrupadas por cliente (límite de 40 ítems):** El límite por factura en SGLoja es de 40 ítems. Si un cliente pide 60 ítems, SGLoja genera dos movimientos, pero al ser del mismo cliente se agrupan o asignan en conjunto al mismo separador.
6. **Faltante con stock en sistema:** Cuando el separador pulsa "No hay", el sistema verifica si en la base de datos figura stock (`QTFISICA > 0`). Si figura stock, emite alerta urgente al supervisor para que verifique físicamente en góndola si existe o si se agotó.
7. **Jornada semanal:** Se trabaja **únicamente de lunes a viernes** (sábado y domingo sin operación).
8. **Marca "Mostrador / Retiro en Local":**
   - **Qué significa:** Identifica notas de clientes que están esperando físicamente en la sucursal para llevarse su mercadería en mano, por lo que tienen **prioridad urgente**. No generan guía de flete ni pasan por el app de envíos.
   - **De dónde sale:** En SGLoja suele venir en el campo `OBS` de la venta (ej. *"RETIRA EN MOSTRADOR"*, *"BALCAO"*), o por el vendedor asignado (`CODVEND` de caja/mostrador). Además, en DepSystem el supervisor tendrá un selector rápido en la nota: `[Mostrador / Urgente]` o `[Envío Flete]`.

---

## 13. Datos a extraer de Firebird (`FB_DADOS.FDB`) para nuestra base de datos
Inspeccionamos la base de datos Firebird en `c:\WorkSpace\motos-mendes-data\FB_DATA\FB_DADOS.FDB`:
1. **Catálogo de Repuestos (`PRD_PRODUTO`):** 4.676 productos con `CODPROD` (SKU), `DESCRICAO`, `CODBAR` (código de barras EAN/UPC para el lector láser), `UNIDMEDIDA` y marca.
2. **Stock Físico Teórico (`PRD_QTDE`):** 4.427 registros con `QTFISICA` (unidades físicas en depósito), `QTRESERVA`, `QTDEPOSITO1` (para validar al instante si el producto debería existir cuando un separador marca faltante).
3. **Ubicaciones de Estantes/Pasillos (`PRD_PRDLOCAL`):** `CODLOCAL` y `DESCRICAO` para que el colector le indique al separador exactamente en qué pasillo o estante está cada repuesto.
4. **Clientes (`CAD_CLIENTE` / `V_CAD_CLIENTE`):** `CODCLIENTE`, `NOME`, `RAZAOSOCIAL`, `ENDERLOGRAD`, `CODCIDADE` y teléfono de contacto.
5. **Vendedores (`CAD_VEND`):** `CODVEND` y `NOME` de los vendedores de la empresa.
6. **Ventas y Pedidos (`MOV_SAIC` y `MOV_SAII`):** 27.952 movimientos con detalle de repuestos, cantidades, timbrados, fecha, hora, observaciones y transportadora.

---

## 14. Plan de Ejecución — Fase 7 (Fundación DepSystem)
1. **Autenticación del Supervisor:** Pantalla de login/identificación de supervisor para firmar confirmaciones, pausas y horas extras.
2. **Motor de Tiempos (`timeEngine.js`):**
   - Inicio a las 07:15.
   - Descuento automático de almuerzo (11:30–13:00).
   - Descuento automático de café de la tarde (15:30–15:45).
   - Fin de turno a las 17:00 con excepción por separador para horas extras habilitadas.
3. **Inicio de Reloj de Picking al Asignar:** Al asignar el supervisor una nota al separador, el estado pasa a `EN_PICKING` y el reloj arranca inmediatamente.
4. **Flujo de Mesa Sugerida y Confirmación:**
   - Separador sugiere mesa → `ESPERA_CONFIRMACION`.
   - Supervisor confirma/reasigna mesa → `ASIGNADO_MESA` (en cola de la mesa, reloj de mesa pausado).
   - El reloj de mesa inicia solo con el primer escaneo del conferencista.
5. **Panel de Separadores Libres y Carga de Mesas:**
   - Visualización de quién está libre y quién tiene nota en curso.
   - Colores de carga en mesas (verde 0–1, naranja 2–4, rojo >4).
   - Alerta visual y sonora por demora de confirmación (>3 a 5 min).
   - Tercer cronómetro: tiempo de espera de confirmación.

