const { pool, query } = require('../db');

const TAX_RATE = Number(process.env.TAX_RATE || 0.12);

const formatInvoice = (invoiceRow, detailRows) => ({
  id: invoiceRow.id,
  numero: invoiceRow.numero,
  fecha: invoiceRow.fecha,
  cliente: {
    id: invoiceRow.cliente_id,
    nombre: invoiceRow.cliente_nombre,
    identificacion: invoiceRow.identificacion,
  },
  subtotal: invoiceRow.subtotal,
  impuestos: invoiceRow.impuestos,
  total: invoiceRow.total,
  estado: invoiceRow.estado,
  detalles: detailRows,
});

const createInvoice = async ({ clienteId, lineas, notas }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: clientRows } = await client.query(
      'SELECT id, nombre FROM clientes WHERE id = $1',
      [clienteId]
    );
    if (!clientRows.length) {
      const error = new Error('Cliente no encontrado');
      error.status = 404;
      throw error;
    }

    let subtotal = 0;

    const productosProcesados = [];

    for (const linea of lineas) {
      const productoId = Number(linea.productoId);
      const cantidad = Number(linea.cantidad);
      if (
        !Number.isInteger(productoId) ||
        productoId <= 0 ||
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        const error = new Error('Línea de detalle inválida');
        error.status = 400;
        throw error;
      }

      const { rows: productRows } = await client.query(
        'SELECT id, nombre, precio, stock FROM productos WHERE id = $1 FOR UPDATE',
        [productoId]
      );
      if (!productRows.length) {
        const error = new Error(`Producto ${productoId} no existe`);
        error.status = 404;
        throw error;
      }
      const product = productRows[0];
      if (product.stock < cantidad) {
        const error = new Error(`Stock insuficiente para ${product.nombre}`);
        error.status = 400;
        throw error;
      }

      const precioUnitario = Number(linea.precioUnitario) > 0 ? Number(linea.precioUnitario) : Number(product.precio);
      const lineaSubtotal = precioUnitario * cantidad;
      subtotal += lineaSubtotal;

      await client.query(
        'UPDATE productos SET stock = stock - $1, actualizado_en = NOW() WHERE id = $2',
        [cantidad, productoId]
      );

      productosProcesados.push({
        producto_id: productoId,
        cantidad,
        precio_unitario: precioUnitario,
        descripcion: product.nombre,
        subtotal: lineaSubtotal,
      });
    }

    const impuestos = Number((subtotal * TAX_RATE).toFixed(2));
    const total = Number((subtotal + impuestos).toFixed(2));

    const { rows: invoiceRows } = await client.query(
      `INSERT INTO facturas (cliente_id, subtotal, impuestos, total, notas)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clienteId, subtotal, impuestos, total, notas || null]
    );

    const factura = invoiceRows[0];

    for (const detalle of productosProcesados) {
      await client.query(
        `INSERT INTO detalle_factura (factura_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)` ,
        [factura.id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
      );
    }

    await client.query('COMMIT');

    const detalles = productosProcesados.map((detalle) => ({
      producto_id: detalle.producto_id,
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario,
      subtotal: detalle.subtotal,
      descripcion: detalle.descripcion,
    }));

    return {
      id: factura.id,
      numero: factura.numero,
      fecha: factura.fecha,
      cliente: {
        id: clienteId,
        nombre: clientRows[0].nombre,
      },
      subtotal,
      impuestos,
      total,
      notas: factura.notas,
      detalles,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getInvoiceById = async (id) => {
  const { rows } = await query(
    `SELECT f.id, f.numero, f.fecha, f.subtotal, f.impuestos, f.total, f.estado, f.notas,
            c.id AS cliente_id, c.nombre AS cliente_nombre, c.identificacion
       FROM facturas f
       JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = $1`,
    [id]
  );
  if (!rows.length) {
    const error = new Error('Factura no encontrada');
    error.status = 404;
    throw error;
  }
  const factura = rows[0];
  const { rows: detalles } = await query(
    `SELECT d.id,
            d.producto_id,
            p.nombre AS descripcion,
            d.cantidad,
            d.precio_unitario,
            d.subtotal
       FROM detalle_factura d
       JOIN productos p ON p.id = d.producto_id
      WHERE d.factura_id = $1
      ORDER BY d.id`,
    [id]
  );
  return formatInvoice(factura, detalles);
};

const listInvoices = async () => {
  const { rows } = await query(
    `SELECT f.id,
            f.numero,
            f.fecha,
            f.subtotal,
            f.impuestos,
            f.total,
            f.estado,
            f.notas,
            c.id AS cliente_id,
            c.nombre AS cliente_nombre,
            c.identificacion,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', d.id,
                  'producto_id', d.producto_id,
                  'descripcion', p.nombre,
                  'cantidad', d.cantidad,
                  'precio_unitario', d.precio_unitario,
                  'subtotal', d.subtotal
                )
              ) FILTER (WHERE d.id IS NOT NULL),
              '[]'
            ) AS detalles
       FROM facturas f
       JOIN clientes c ON c.id = f.cliente_id
       LEFT JOIN detalle_factura d ON d.factura_id = f.id
       LEFT JOIN productos p ON p.id = d.producto_id
      GROUP BY f.id, c.id
      ORDER BY f.fecha DESC
      LIMIT 100`
  );

  return rows.map((row) => ({
    id: row.id,
    numero: row.numero,
    fecha: row.fecha,
    cliente: {
      id: row.cliente_id,
      nombre: row.cliente_nombre,
      identificacion: row.identificacion,
    },
    subtotal: row.subtotal,
    impuestos: row.impuestos,
    total: row.total,
    estado: row.estado,
    notas: row.notas,
    detalles: row.detalles ?? [],
  }));
};

module.exports = {
  createInvoice,
  getInvoiceById,
  listInvoices,
};
