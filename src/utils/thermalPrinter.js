/**
 * Módulo de Impresión Térmica Directa para DepSyS Industrial
 * Motos Mendes S.A.
 * 
 * Formato optimizado para impresoras térmicas de 80mm / 58mm (ESC/POS compatible).
 * Utiliza un iframe aislado de alta resolución sin márgenes para disparo instantáneo.
 */

export function generarTicketHtml(nota, metrics = {}, opciones = {}) {
  const fecha = new Date();
  const fechaFmt = fecha.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaFmt = fecha.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const numPedido = nota?.num_pedido || '00000';
  const clienteNombre = nota?.cliente_nombre || 'CLIENTE MOSTRADOR';
  const clienteCodigo = nota?.cliente_codigo || 'SGLOJA';
  const clienteCiudad = nota?.cliente_ciudad || 'CIUDAD DEL ESTE';
  const esMostrador = nota?.es_mostrador === 1;
  const totalItems = nota?.total_items || (nota?.items ? nota.items.length : 0);
  const totalPiezas = nota?.total_piezas || totalItems;
  const separadorNombre = nota?.separador_nombre || 'Separador';
  const mesaCodigo = nota?.mesa_codigo || localStorage.getItem('depsystem_mesa_codigo') || '301';
  const tiempoPicking = nota?.tiempo_separacion_fmt || '00:00:00';
  const tiempoMesa = metrics?.tiempoNetoMesaFmt || '00:00:00';
  const tiempoTotal = metrics?.tiempoTotalCicloFmt || '00:00:00';
  const bultoNum = opciones.bultoActual || 1;
  const totalBultos = opciones.totalBultos || 1;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rótulo de Despacho #${numPedido}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body {
      width: 76mm;
      margin: 2mm auto;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.25;
      font-weight: bold;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: 900; }
    .border-top { border-top: 1.5px dashed #000; padding-top: 4px; margin-top: 4px; }
    .border-bottom { border-bottom: 1.5px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
    .border-solid { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 4px 0; }
    
    .titulo-empresa {
      font-size: 14px;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .subtitulo {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .num-pedido {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 2px;
      margin: 4px 0;
    }
    .badge-mostrador {
      font-size: 12px;
      padding: 2px 4px;
      border: 2px solid #000;
      display: inline-block;
      margin: 3px 0;
    }
    .datos-fila {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .cliente-nombre {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 3px 0;
      word-break: break-word;
    }
    .bulto-box {
      font-size: 15px;
      border: 2px solid #000;
      padding: 4px;
      margin: 5px 0;
      text-align: center;
      letter-spacing: 1px;
    }
    .codigo-barras-sim {
      font-size: 16px;
      letter-spacing: 4px;
      margin: 6px 0;
      font-family: monospace;
    }
    .footer-nota {
      font-size: 8px;
      margin-top: 8px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="titulo-empresa bold">MOTOS MENDES S.A.</div>
    <div class="subtitulo">SISTEMA INTEGRAL DE DEPÓSITO • DEPSYS</div>
    <div class="subtitulo">CONTROL DE CALIDAD Y EMPAQUE</div>
  </div>

  <div class="border-solid text-center">
    <div>RÓTULO DE DESPACHO</div>
    <div class="num-pedido bold">#${numPedido}</div>
    ${esMostrador ? '<div class="badge-mostrador bold">⚡ ENTREGA EN MOSTRADOR (URGENTE)</div>' : ''}
    <div class="codigo-barras-sim bold">*${numPedido}*</div>
  </div>

  <div class="bulto-box bold">
    BULTO ${bultoNum} DE ${totalBultos}
  </div>

  <div class="border-bottom">
    <div class="subtitulo">DESTINATARIO:</div>
    <div class="cliente-nombre">${clienteNombre}</div>
    <div class="datos-fila">
      <span>CÓDIGO:</span>
      <span class="bold">${clienteCodigo}</span>
    </div>
    <div class="datos-fila">
      <span>DESTINO:</span>
      <span class="bold">${clienteCiudad}</span>
    </div>
  </div>

  <div class="border-bottom">
    <div class="datos-fila">
      <span>TOTAL ÍTEMS:</span>
      <span class="bold">${totalItems} SKUs</span>
    </div>
    <div class="datos-fila">
      <span>TOTAL PIEZAS:</span>
      <span class="bold">${totalPiezas} UNIDADES</span>
    </div>
    <div class="datos-fila">
      <span>ESTADO VERIF.:</span>
      <span class="bold">100% OK FÍSICO</span>
    </div>
  </div>

  <div class="border-bottom">
    <div class="subtitulo">TRAZABILIDAD OPERATIVA:</div>
    <div class="datos-fila">
      <span>RECOLECTOR:</span>
      <span>${separadorNombre}</span>
    </div>
    <div class="datos-fila">
      <span>BANCADA DE CONTROL:</span>
      <span class="bold">MESA ${mesaCodigo}</span>
    </div>
    <div class="datos-fila">
      <span>FECHA / HORA:</span>
      <span>${fechaFmt} ${horaFmt}</span>
    </div>
  </div>

  <div class="border-bottom">
    <div class="subtitulo">TIEMPOS NETOS EFECTIVOS:</div>
    <div class="datos-fila">
      <span>TIEMPO PICKING:</span>
      <span>${tiempoPicking}</span>
    </div>
    <div class="datos-fila">
      <span>TIEMPO EMPAQUE:</span>
      <span>${tiempoMesa}</span>
    </div>
    <div class="datos-fila bold">
      <span>CICLO TOTAL:</span>
      <span>${tiempoTotal}</span>
    </div>
  </div>

  <div class="text-center footer-nota">
    VERIFICADO Y SELLADO • COMPROBANTE OFICIAL DE EMPAQUE<br>
    --- CORTE AQUÍ ---
  </div>
</body>
</html>
  `;
}

/**
 * Dispara la impresión térmica del rótulo de despacho
 */
export function imprimirRotuloBulto(nota, metrics = {}, opciones = {}) {
  try {
    const ticketHtml = generarTicketHtml(nota, metrics, opciones);

    // Crear iframe invisible para impresión limpia
    let iframe = document.getElementById('thermal-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'thermal-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(ticketHtml);
    doc.close();

    // Disparar ventana de impresión térmica nativa de Windows
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (printErr) {
        console.warn('Error al invocar impresión térmica:', printErr);
      }
    }, 250);

    return true;
  } catch (err) {
    console.error('Error generando ticket térmico:', err);
    return false;
  }
}
