# DepSyS Desktop • Terminal de Supervisores, Mesas y Distribución

Aplicación de escritorio oficial de **DepSyS** para terminales PC del depósito de **Motos Mendes S.A.** Desarrollada con **React + Vite + Tauri v2** para Windows (WebView2 nativo).

## 🖥️ Módulos Principales
- **Centro de Control y Supervisión:** Asignación de pedidos y distribución de carga de trabajo.
- **Bandeja de Confirmaciones y Excepciones:** Resolución de demoras, faltantes de stock y esperas de mesa.
- **Monitoreo de Mesas:** Control de bancadas 301 a 319 y guardadores fijos.
- **Aprobación de Pedidos ERP:** Evaluación comercial y financiera contra Firebird ERP.
- **Auto-Actualizador Integrado:** Verificación criptográfica con Minisign y actualización en un clic.

## 🚀 Compilación y Ejecución
```bash
# Modo desarrollo con recarga en vivo
npm run dev

# Compilar instaladores de producción (.exe NSIS y .msi WiX)
npm run desktop:build
```

---
*© Motos Mendes S.A. • Todos los derechos reservados.*
