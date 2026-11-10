# 📄 Plan Maestro: Facturador Electrónico Directo SIFEN (DNIT) - Motos Mendes S.A.
**Ecosistema DepSyS | Versión 1.0.0**  
**Fecha de Elaboración:** 09/11/2026  
**Responsable Técnico:** Arquitectura DepSyS / Motos Mendes S.A.

---

## 🎯 1. Objetivo Estratégico

Lograr la **independencia tecnológica y soberanía operativa total** de Motos Mendes S.A. en materia de Facturación Electrónica en Paraguay:
1. **Eliminar intermediarios externos:** Prescindir de **FacturaSend (TIPS S.A.)**, ahorrando cuotas mensuales y costos por paquete de facturas.
2. **Apagar definitivamente el software legado (SGLoja / Firebird):** Eliminar la dependencia de `C:\System\SGLoja` y `FB_DADOS.FDB`.
3. **Conexión Directa a la DNIT / SET:** Desarrollar un microservicio autónomo dentro del ecosistema DepSyS (alojado en el servidor `192.168.1.125`) que emita, firme digitalmente y transmita facturas directamente a los servidores oficiales de SIFEN (`sifen.set.gov.py`).
4. **Privacidad y Seguridad:** Mantener todos los datos de clientes, precios, costos y facturación 100% confidenciales dentro de la red privada de Motos Mendes.

---

## 🔍 2. Diagnóstico del Estado Actual (Ingeniería Inversa Confirmada al 09/11/2026)

Tras analizar los binarios y el código fuente Delphi de `Programas_PC301225` y `System\SGLoja`:

```
[Mostrador / Venta] 
        │
        ▼
  [SGLojaDe.exe] (Genera JSON en memoria)
        │
        ▼ HTTP POST (JSON)
  [FacturaSend API: http://45.172.230.96:85/api/motosmendessa/]
        │
        ├─► Firma con Certificado Motos Mendes (CODE100 S.A.)
        ├─► Genera XML SIFEN v150
        ├─► Transmite a la DNIT (sifen.set.gov.py)
        └─► Genera KuDE (PDF)
        │
        ▼ Retorna CDC, XML y PDF
  [SGLoja Guarda en FB_DADOS.FDB (FIS_NFC)]
        │
        ▼
  [SGLojaSap.exe] ──► [API Node: 192.168.1.165:3004] ──► [SAP Business One HANA]
```

### Parámetros Tributarios y Operativos Confirmados:
* **Razón Social:** MOTOS MENDES SOCIEDAD ANONIMA
* **RUC:** `80085473-0`
* **Timbrado Oficial:** `17862591` (Vigente desde `27/02/2025`)
* **Establecimientos y Puntos:** Establecimiento `001`, Puntos de Expedición `001` y `002`
* **Certificado Digital:**
  * **Entidad Emisora:** `CODE100 S.A.` (Prestador Cualificado de Confianza)
  * **Titular:** `ELIAS MENDES` (CI: `5072428`)
  * **Vigencia:** `29/12/2025` al `29/12/2026`
  * **Correo Oficial:** `bicimotosmendes@hotmail.com`
* **Código de Seguridad del Contribuyente (CSC):** Identificador `IdCSC=0001`

---

## 🏛️ 3. Arquitectura del Microservicio Autónomo (`depsys-sifen`)

El nuevo facturador residirá en el servidor dedicado `192.168.1.125` como parte de `backend-api` (o como servicio complementario en el puerto `3016`):

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SERVIDOR DEPSYS (192.168.1.125)                      │
│                                                                        │
│  [Módulo de Venta / Terminal] ──► [MySQL mendes_db / SAP HANA]        │
│                                           │                            │
│                                           ▼                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │               MICROSERVICIO SIFEN (depsys-sifen)                 │  │
│  │                                                                  │  │
│  │  1. Generador de CDC (44 dígitos, algoritmo Módulo 11)           │  │
│  │  2. Ensamblador de XML SIFEN v150 (Canonical UTF-8)              │  │
│  │  3. Motor de Firma XML-DSig (RSA-SHA256 con .p12 de CODE100)     │  │
│  │  4. Generador de QR Oficial (SHA256 con CSC 0001)                │  │
│  │  5. Cliente SOAP HTTPS (siRecepDE / siRecepLoteDE)               │  │
│  │  6. Generador de KuDE (PDF A4 y Ticket 80mm térmico)             │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │ SOAP / HTTPS
                                     ▼
             ┌───────────────────────────────────────────────┐
             │       DNIT / SET PARAGUAY                     │
             │       • Test: sifen-test.set.gov.py           │
             │       • Producción: sifen.set.gov.py          │
             └───────────────────────────────────────────────┘
```

---

## 📅 4. Fases de Ejecución

### FASE 1: Motor Lógico y Estructural (Offline / Sin riesgo)
* **Objetivo:** Tener la maquinaria de armado de comprobantes funcionando sin tocar aún producción.
* **Tareas:**
  1. Programar la función matemática del CDC (44 dígitos + DV Módulo 11).
  2. Implementar la plantilla XML v150 con soporte para IVA 10%, IVA 5% y Exentas.
  3. Implementar el cálculo del hash del QR (`cHashQR`) con el identificador `IdCSC=0001`.
  4. **Prueba de Verificación Espejo:** Tomar el XML emitido el día de hoy (`DE1_90373_9112026.XML`) y pasarle los mismos datos de entrada a nuestro generador. El resultado debe ser 100% idéntico estructuralmente.

### FASE 2: Integración de Firma Digital y Certificado (.p12)
* **Objetivo:** Incorporar la capacidad de sellado digital criptográfico.
* **Tareas:**
  1. Obtener de Administración/Don Elias el archivo de respaldo `.p12` / `.pfx` de CODE100 y su contraseña.
  2. Almacenar el archivo de forma segura en `C:\DepSyS\certificates\` en el servidor `192.168.1.125`.
  3. Implementar el firmador enveloped `xml-crypto` con canonicalización `xml-exc-c14n#` y algoritmo `rsa-sha256`.
  4. Verificar que la firma generada sea válida contra el validador oficial de esquemas XSD de la SET.

### FASE 3: Conexión con Ambiente de Test DNIT (`sifen-test.set.gov.py`)
* **Objetivo:** Lograr las primeras autorizaciones oficiales en el sandbox de la DNIT.
* **Tareas:**
  1. Configurar el cliente SOAP contra `https://sifen-test.set.gov.py/de/ws/sync/recibe.wsdl`.
  2. Enviar facturas de prueba con clientes de prueba (RUC ficticio / cliente innominado).
  3. Procesar las respuestas de la SET: código `0200` (Aprobado), captura del protocolo de autorización y manejo de errores tributarios.
  4. Implementar los endpoints de Consulta (`siConsDE`) y Evento de Cancelación (`siRecepEvento`).

### FASE 4: Renderizado KuDE (Impresión Mostrador y PDF)
* **Objetivo:** Disponer del comprobante impreso legal para entregar al cliente.
* **Tareas:**
  1. Crear la plantilla HTML/CSS para ticket térmico estándar de 80mm (impresoras de mostrador).
  2. Crear la plantilla PDF A4 para clientes corporativos o envío por correo.
  3. Renderizar el código QR oficial con la librería nativa para que sea escaneable con la app oficial de la SET/DNIT ("e-kuatia").

### FASE 5: Homologación Final, Corte y Apagado de SGLoja
* **Objetivo:** Pasar a producción y desvincularse de FacturaSend.
* **Tareas:**
  1. Verificar el cumplimiento de la cantidad mínima de pruebas requeridas por la DNIT en ambiente de test.
  2. Solicitar el pase formal o activar el endpoint de producción `https://sifen.set.gov.py/de/ws/sync/recibe.wsdl`.
  3. Conectar el nuevo sistema de ventas / mostrador para que envíe directamente al nuevo microservicio `depsys-sifen`.
  4. Notificar a TIPS S.A. la baja del servicio FacturaSend.
  5. Desactivar y archivar los ejecutables de SGLoja y la base Firebird `FB_DADOS.FDB`.

---

## 📋 5. Checklist de Insumos Pendientes (Área Administrativa)

Para completar la Fase 2 y 3, se requiere coordinar con el departamento contable o con Don Elias Mendes:

- [ ] **Archivo del Certificado Digital:** Archivo con extensión `.p12` o `.pfx` emitido por `CODE100 S.A.`.  
  *(Buscar en correos de diciembre de 2025 dirigidos a `bicimotosmendes@hotmail.com` o en la PC donde se tramitó la firma)*.
- [ ] **Contraseña del Certificado:** Clave elegida al momento de generar el archivo `.p12`.
- [ ] **Valor del CSC (Código Secreto del Contribuyente):** Cadena secreta generada en el portal Marangatu de la SET asociada al `IdCSC=0001` *(necesaria para el cálculo del hash del QR)*.

---

## 💡 6. Resumen de Ventajas para Motos Mendes S.A.

1. **Ahorro permanente:** Cero comisiones o costos recurrentes por cada factura emitida.
2. **Alta disponibilidad:** La facturación de las tiendas no depende de caídas de servidores de terceros.
3. **Control total del software:** Adaptación inmediata ante cualquier cambio de resolución de la DNIT.
4. **Ecosistema Integrado:** El facturador queda conectado de forma nativa con el depósito (DepSyS) y con SAP Business One.

