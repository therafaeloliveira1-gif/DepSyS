# Reglas y Estructura - DepSyS (Sistema de Depósito y Picking)

Este archivo contiene las directivas fundamentales para el ecosistema DepSyS de Motos Mendes S.A.

## 🏛️ Componentes del Sistema DepSyS
1. **depsys-desktop (`c:\WorkSpace\DepSyS\DepSyS\src-tauri`):** Aplicación de escritorio nativa Windows (Tauri v2 + WebView2 nativo) compilada como `depsys-desktop.exe` para terminales PC del depósito.
2. **DepSyS Desktop (`c:\WorkSpace\DepSyS\DepSyS`):** Código fuente de la interfaz unificada de terminales PC (Supervisor, Guardador de Mesa y Distribuidor) (React + Vite + Tauri).
3. **app-picking (`c:\WorkSpace\DepSyS\app-picking`):** Aplicación móvil para recolectores/separadores con lectores láser o colectores de datos (React + Vite + Capacitor APK).
4. **backend-api (`c:\WorkSpace\DepSyS\backend-api`):** API en Node.js Express (puerto 3015) para orquestación en tiempo real y adaptador binario Firebird.
5. **Backend PHP / APIs (`c:\WorkSpace\motos-mendes-data\motos-mendes-api\api\DepSyS_Api`):** Endpoints PHP de producción en Apache/MySQL.

---

## ⚡ Regla 1: Ponytail (Senior Dev Pragmático / YAGNI)
- **Premisa:** El mejor código es el código que nunca se tuvo que escribir.
- **YAGNI:** Si una función o abstracción no es estrictamente necesaria hoy, no se construye.
- **Causa Raíz:** Resolver bugs en el origen compartido, no colocando parches cosméticos repetidos.
- **Herramientas nativas:** Preferir la API estándar de JavaScript / HTML / CSS / SQL antes que incorporar librerías pesadas o capas redundantes.
- **Eliminar antes que agregar:** Priorizar código simple, robusto y directo. Cero boilerplate para casos hipotéticos.

---

## 📅 Regla 2: Formato de Fechas Obligatorio - Paraguay (`DD/MM/AAAA`)
- **Formato visible al usuario:** Siempre `DD/MM/AAAA` (Día / Mes / Año de 4 dígitos, separado por barras `/`).
- **Aplicación:** Pantallas de pedidos, auditorías, aprobaciones de crédito, tarjetas de picking, mesas, despachos y reportes.
- **Horas:** Cuando aplique mostrar la hora, usar formato `DD/MM/AAAA HH:mm` o `HH:mm:ss`.
- **APIs / DB:** Preservar `YYYY-MM-DD` o ISO strings a nivel interno de base de datos MySQL/Firebird solo por requerimiento del motor, pero **toda capa de presentación y formateo hacia el operador debe ser `DD/MM/AAAA`**.

---

## 🎨 Regla 3: Identidad Visual Oficial Motos Mendes (CERO Azulado IA / Anti-Slate)
- **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido usar los fondos oscuros azulados, índigo o violáceos típicos de plantillas de IA (`#0f172a`, `#1e293b`, `#080c14`, `#0d1424`, slate, navy blue, purple orbs). Tampoco usar degradados rosas o magenta fucsia (`#e11d48`, `#f43f5e`).
- **Dark Mode Oficial (Titanio, Carbón y Grafito Puro):**
  - **Fondo de Pantalla:** `#09090b` (Zinc-950 puro) o negro absoluto `#050505`. Cero tinte azul.
  - **Superficies / Cards:** `#121214` o `#18181b` (Zinc-900 puro).
  - **Bordes y Separadores:** `#27272a` (Zinc-800) o `rgba(255, 255, 255, 0.08)`.
  - **Textos:** Títulos `#ffffff`, subtítulos `#a1a1aa` (Zinc-400), secundarios `#71717a` (Zinc-500).
- **Rojo Motos Mendes Oficial (El Único Rojo de Acción):**
  - **Primario (Botones, CTA, Indicadores clave):** `#e60000` (Rojo puro institucional, sólido, sin degradados raros).
  - **Hover / Click:** `#cc0000` / `#b30000`.
  - **Anillo de Foco:** `rgba(230, 0, 0, 0.35)`.
- **Light Mode Oficial:**
  - Fondo `#fafafa` con tarjetas blancas `#ffffff`, bordes `#e4e4e7` y texto `#18181b`.

