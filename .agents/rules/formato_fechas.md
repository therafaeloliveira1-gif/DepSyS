---
description: Regla de formato regional de fechas para Paraguay (DD/MM/AAAA)
globs: ["**/*"]
---

# Formato de Fechas: Paraguay (DD/MM/AAAA)

En cualquier tarea de desarrollo, documentación, interfaz de usuario (UI), base de datos para visualización humana, logs legibles, bitácoras o notas en Obsidian:

- **Formato obligatorio**: `DD/MM/AAAA` (Día / Mes / Año con 4 dígitos, ej. `14/09/2026`).
- **Separador**: Utilizar la barra `/` por defecto (`DD/MM/AAAA`).
- **Interfaces de usuario (Frontend/Apps)**:
  - Al mostrar fechas a usuarios o clientes en Paraguay (ej. facturas, pedidos, despachos, reportes de ventas, listados), el formato visible debe ser siempre `DD/MM/AAAA`.
- **Documentación y Bitácora en Obsidian**:
  - Toda fecha registrada en notas, minutas, bitácoras o estados de proyecto debe escribirse en formato `DD/MM/AAAA`.
- **Bases de datos y APIs (a nivel interno/técnico)**:
  - Si el motor de base de datos o estándar ISO requiere internamente `YYYY-MM-DD` (ej. tipo DATE de MySQL o Firebird) o timestamps UTC, se preserva internamente para compatibilidad técnica, pero **la capa de presentación, entrada del usuario y documentación siempre se maneja en `DD/MM/AAAA`**.
