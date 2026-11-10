const { 
  obtenerPedidoFirebird, 
  listarPedidosPendientesFirebird, 
  buscarClientesFirebird 
} = require('../adapters/firebirdAdapter');

/**
 * Consulta un pedido real en Firebird y normaliza la estructura con datos de crédito y descuentos.
 * @param {string|number} numPedido - Número del pedido (ej: 38002 o 46811)
 * @returns {Promise<Object>} Pedido normalizado con sus repuestos reales y análisis crediticio
 */
async function getPedidoReal(numPedido) {
  if (!numPedido) {
    return { success: false, error: 'Debe ingresar un número de pedido o nota' };
  }

  const result = await obtenerPedidoFirebird(numPedido);

  if (!result.success || !result.pedido) {
    return {
      success: false,
      error: result.error || `El pedido N° ${numPedido} no fue encontrado en el sistema SGLoja.`
    };
  }

  const raw = result.pedido;
  const items = Array.isArray(raw.items) ? raw.items : [];

  if (items.length === 0) {
    return {
      success: false,
      error: `El pedido N° ${numPedido} existe pero no tiene ítems asociados.`
    };
  }

  // Calcular total de piezas físicas a separar
  const totalPiezas = items.reduce((sum, it) => sum + (Number(it.cantidad) || 0), 0);

  // Normalizar ítems con descuentos y precios
  const normalizedItems = items.map((it, idx) => ({
    id: idx + 1,
    num_item: it.num_item || (idx + 1),
    sku: String(it.sku || it.cod_producto || '').trim(),
    codigo_barra: String(it.codigo_barra || it.cod_producto || '').trim(),
    descripcion: (it.descripcion || 'REPUESTO').trim(),
    cant_caja: it.cant_caja || 1,
    cantidad: Math.round(Number(it.cantidad || it.cantidad_requerida) || 1),
    cantidad_requerida: Math.round(Number(it.cantidad || it.cantidad_requerida) || 1),
    cantidad_bipada: 0,
    precio_lista: Number(it.precio_lista) || Number(it.precio_unitario) || 0,
    precio_unitario: Number(it.precio_unitario) || 0,
    porcentaje_descuento: Number(it.porcentaje_descuento) || 0,
    monto_descuento: Number(it.monto_descuento) || 0,
    lote: it.lote || '',
    subtotal: Number(it.subtotal) || 0,
    ubicacion: it.ubicacion || 'PAS-01',
    estado: 'PENDIENTE'
  }));

  const cli = raw.cliente || {};

  const normalizedOrder = {
    num_nota: String(raw.num_pedido).trim(),
    num_pedido: String(raw.num_pedido).trim(),
    fecha_pedido: raw.fecha_pedido || '',
    hora_pedido: raw.hora_pedido || '',
    condicion_pago_id: raw.condicion_pago_id || 1,
    condicion_pago_nombre: raw.condicion_pago_nombre || 'AL CONTADO',
    es_credito: Boolean(raw.es_credito),
    cliente_codigo: String(cli.codigo || raw.cod_cliente || '').trim(),
    cliente_nombre: (cli.nombre || raw.nombre_cliente || '').trim(),
    cliente_razon_social: (cli.razon_social || '').trim(),
    cliente_ruc_cedula: (cli.ruc_cedula || '').trim(),
    cliente_ciudad: (cli.ciudad || cli.cidade || '').trim(),
    cliente_telefono: (cli.telefono || '').trim(),
    cliente_direccion: (cli.direccion || '').trim(),
    vendedor_id: raw.vendedor_id || 0,
    subtotal_bruto: Number(raw.subtotal_bruto) || Number(raw.valor_total || raw.total_monto) || 0,
    descuento_total: Number(raw.descuento_total) || 0,
    valor_total: Number(raw.valor_total || raw.total_monto) || 0,
    total_items: items.length,
    total_piezas: Math.round(totalPiezas),
    total_bips_realizados: 0,
    observaciones: (raw.observaciones || '').trim(),
    estado: raw.estado || 'PENDIENTE_CREDITO',
    origen: 'FIREBIRD_SGLOJA_REAL',
    cliente: {
      codigo: String(cli.codigo || raw.cod_cliente || '').trim(),
      nombre: (cli.nombre || raw.nombre_cliente || '').trim(),
      razon_social: (cli.razon_social || '').trim(),
      ruc_cedula: (cli.ruc_cedula || '').trim(),
      ciudad: (cli.ciudad || cli.cidade || '').trim(),
      telefono: (cli.telefono || '').trim(),
      direccion: (cli.direccion || '').trim(),
      limite_credito: Number(cli.limite_credito) || 0,
      saldo_deudor: Number(cli.saldo_deudor) || 0,
      saldo_disponible: Number(cli.saldo_disponible) || 0,
      facturas_vencidas_cant: Number(cli.facturas_vencidas_cant) || 0,
      facturas_vencidas_monto: Number(cli.facturas_vencidas_monto) || 0,
      facturas_pendientes_cant: Number(cli.facturas_pendientes_cant) || 0,
      facturas_pendientes: cli.facturas_pendientes || [],
      estado_credito: cli.estado_credito || 'AL_DIA'
    },
    items: normalizedItems
  };

  return {
    success: true,
    pedido: normalizedOrder
  };
}

module.exports = {
  getPedidoReal,
  listarPedidosPendientesFirebird,
  buscarClientesFirebird
};
