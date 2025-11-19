const DEFAULT_API_BASE =
  'https://movil-2-qna8j.ondigitalocean.app/movil-2-backend';
const IVA_RATE = 0.12;
const currencyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
});
const formatCurrency = (value = 0) => currencyFormatter.format(Number(value) || 0);
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '--';

const inventarioContainer = document.getElementById('inventario');
const clientesContainer = document.getElementById('clientes');
const clienteSelect = document.getElementById('clienteSelect');
const lineasContainer = document.getElementById('lineas');
const facturaForm = document.getElementById('facturaForm');
const resultado = document.getElementById('facturaResultado');
const notasInput = document.getElementById('notas');
const addLineaBtn = document.getElementById('addLinea');
const refreshBtn = document.getElementById('refreshBtn');
const statusBadge = document.getElementById('statusBadge');
const lastSyncLabel = document.getElementById('lastSync');
const apiInfoLabel = document.getElementById('apiInfo');
const totalProductosEl = document.getElementById('totalProductos');
const totalClientesEl = document.getElementById('totalClientes');
const stockCriticoEl = document.getElementById('stockCritico');
const summarySubtotalEl = document.getElementById('summarySubtotal');
const summaryIvaEl = document.getElementById('summaryIva');
const summaryTotalEl = document.getElementById('summaryTotal');
const productoForm = document.getElementById('productoForm');
const clienteForm = document.getElementById('clienteForm');
const productoMessage = document.getElementById('productoMessage');
const clienteMessage = document.getElementById('clienteMessage');
const facturasContainer = document.getElementById('facturas');
const loadFacturasBtn = document.getElementById('loadFacturas');
const facturasStatus = document.getElementById('facturasStatus');

const viewButtons = document.querySelectorAll('.nav-button');
const views = document.querySelectorAll('.view');
const stockBarCanvas = document.getElementById('stockBarChart');
const stockPieCanvas = document.getElementById('stockPieChart');
const ventasCanvas = document.getElementById('ventasChart');

const state = {
  apiBase: DEFAULT_API_BASE,
  inventario: [],
  clientes: [],
  productos: [],
  facturas: [],
  currentView: 'inventario',
  charts: {},
};

apiInfoLabel.textContent = state.apiBase;

const setStatus = (message, tone = 'info') => {
  statusBadge.textContent = message;
  statusBadge.classList.remove('success', 'error');
  if (tone === 'success') {
    statusBadge.classList.add('success');
  } else if (tone === 'error') {
    statusBadge.classList.add('error');
  }
};

const setActiveView = (view) => {
  state.currentView = view;
  views.forEach((section) => {
    section.classList.toggle('active', section.dataset.view === view);
  });
  viewButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === view);
  });
};

const showFormMessage = (element, message, tone = 'success') => {
  if (!element) return;
  element.textContent = message;
  element.classList.remove('success', 'error');
  if (tone === 'success') {
    element.classList.add('success');
  } else if (tone === 'error') {
    element.classList.add('error');
  }
  if (message) {
    setTimeout(() => {
      element.textContent = '';
      element.classList.remove('success', 'error');
    }, 4000);
  }
};

const parseErrorMessage = async (response) => {
  const text = await response.text();
  if (!text) return `Error ${response.status}`;
  try {
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (Array.isArray(data.errors)) {
      return data.errors.map((err) => err.msg || err.message).join(', ');
    }
    return text;
  } catch (error) {
    return text;
  }
};

const fetchJson = async (path, options = {}) => {
  const url = `${state.apiBase}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message || 'Error de red');
  }
  return response.headers.get('content-type')?.includes('application/json')
    ? response.json()
    : response.text();
};

const renderInventario = () => {
  inventarioContainer.innerHTML = state.inventario
    .map(
      (item) => `
        <article class="card">
          <h3>${item.nombre}</h3>
          <p>SKU: ${item.sku}</p>
          <p>Stock: <strong>${item.stock}</strong></p>
          <p>Precio: $${item.precio}</p>
          <span class="badge ${
            item.requiere_reabastecimiento ? 'alert' : 'ok'
          }">
            ${item.requiere_reabastecimiento ? 'Reponer inventario' : 'Stock OK'}
          </span>
        </article>
      `
    )
    .join('');
};

const updateChart = (key, canvas, config) => {
  if (!canvas || !window.Chart) return;
  if (state.charts[key]) {
    state.charts[key].destroy();
  }
  state.charts[key] = new Chart(canvas, config);
};

const renderInventoryCharts = () => {
  if (!state.inventario.length) return;
  const labels = state.inventario.map((item) => item.nombre);
  const stockData = state.inventario.map((item) => item.stock);

  updateChart('stockBar', stockBarCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Stock disponible',
          data: stockData,
          backgroundColor: '#4f46e5',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  const criticos = state.inventario.filter((item) => item.requiere_reabastecimiento)
    .length;
  const ok = state.inventario.length - criticos;

  updateChart('stockPie', stockPieCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Stock OK', 'Crítico'],
      datasets: [
        {
          data: [ok, criticos],
          backgroundColor: ['#22c55e', '#dc2626'],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
};

const renderClientes = () => {
  clientesContainer.innerHTML = state.clientes
    .map(
      (cliente) => `
        <article class="card">
          <h3>${cliente.nombre}</h3>
          <p>Identificación: ${cliente.identificacion}</p>
          <p>Tel: ${cliente.telefono || 'N/A'}</p>
        </article>
      `
    )
    .join('');

  clienteSelect.innerHTML =
    '<option value="">Seleccione un cliente</option>' +
    state.clientes
      .map((cliente) => `<option value="${cliente.id}">${cliente.nombre}</option>`)
      .join('');
};

const resolveProductoId = (linea) => {
  if (linea?.productoId) return linea.productoId;
  return state.productos[0]?.id ?? '';
};

const getProductPrice = (productoId) => {
  const producto = state.productos.find(
    (item) => Number(item.id) === Number(productoId)
  );
  return producto ? Number(producto.precio) : 0;
};

const renderLineaRow = (linea, index) => {
  const resolvedProductoId = resolveProductoId(linea);
  const hasSelection = Boolean(resolvedProductoId);
  const resolvedPrecio =
    typeof linea?.precioUnitario === 'number' && linea?.precioUnitario > 0
      ? linea.precioUnitario
      : hasSelection
      ? getProductPrice(resolvedProductoId)
      : '';
  return `
    <div class="linea" data-index="${index}">
      <label>
        Producto
        <select class="producto" required>
          <option value="" ${hasSelection ? '' : 'selected'}>Seleccione...</option>
          ${state.productos
            .map(
              (producto) => `
                <option value="${producto.id}" ${
                  Number(resolvedProductoId) === Number(producto.id) ? 'selected' : ''
                }>${producto.nombre}</option>
              `
            )
            .join('')}
        </select>
      </label>
      <label>
        Cantidad
        <input class="cantidad" type="number" min="1" value="${linea?.cantidad || 1}" />
      </label>
      <label>
        Precio unitario
        <input class="precio" type="number" min="0.01" step="0.01" value="${
          resolvedPrecio !== '' ? Number(resolvedPrecio).toFixed(2) : ''
        }" />
      </label>
      <p class="line-total">
        Total línea: <strong data-line-total>$0.00</strong>
      </p>
      <button type="button" class="remove">Eliminar</button>
    </div>
  `;
};

const addLinea = () => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderLineaRow({}, Date.now());
  const nuevaLinea = wrapper.firstElementChild;
  lineasContainer.appendChild(nuevaLinea);
  syncLinePriceWithProduct(nuevaLinea);
  updateSummary();
};

const removeLinea = (target) => {
  if (lineasContainer.children.length === 1) return;
  target.closest('.linea').remove();
  updateSummary();
};

const readLinesRaw = () => {
  return [...lineasContainer.querySelectorAll('.linea')].map((lineaEl) => ({
    productoId: Number(lineaEl.querySelector('.producto').value),
    cantidad: Number(lineaEl.querySelector('.cantidad').value),
    precioUnitario: Number(lineaEl.querySelector('.precio').value),
    elemento: lineaEl,
  }));
};

const getValidLines = () =>
  readLinesRaw()
    .filter(
      (linea) =>
        linea.productoId &&
        Number(linea.cantidad) > 0 &&
        Number(linea.precioUnitario) > 0
    )
    .map(({ elemento, ...rest }) => rest);

const updateSummary = () => {
  const lineas = readLinesRaw();
  let subtotal = 0;
  lineas.forEach((linea) => {
    let totalLinea = 0;
    if (linea.productoId && linea.cantidad > 0 && linea.precioUnitario > 0) {
      totalLinea = linea.cantidad * linea.precioUnitario;
      subtotal += totalLinea;
    }
    const target = linea.elemento.querySelector('[data-line-total]');
    if (target) {
      target.textContent = formatCurrency(totalLinea);
    }
  });
  const iva = Number((subtotal * IVA_RATE).toFixed(2));
  const total = Number((subtotal + iva).toFixed(2));
  summarySubtotalEl.textContent = formatCurrency(subtotal);
  summaryIvaEl.textContent = formatCurrency(iva);
  summaryTotalEl.textContent = formatCurrency(total);
};

const renderFacturas = () => {
  if (!facturasContainer) return;
  if (!state.facturas.length) {
    facturasContainer.innerHTML =
      '<p class="hint">No hay facturas registradas o no se han cargado aún.</p>';
    return;
  }

  facturasContainer.innerHTML = state.facturas
    .map((factura) => {
      const detalles = Array.isArray(factura.detalles) ? factura.detalles : [];
      const detalleLista = detalles
        .map(
          (detalle) => `
            <li>
              ${detalle.descripcion || `Producto ${detalle.producto_id}`} · ${
            detalle.cantidad
          } x ${formatCurrency(detalle.precio_unitario)} =
              ${formatCurrency(detalle.subtotal)}
            </li>
          `
        )
        .join('');

      return `
        <article class="invoice-card">
          <header>
            <h3>${factura.numero}</h3>
            <span>${formatDate(factura.fecha)}</span>
          </header>
          <p><strong>Cliente:</strong> ${factura.cliente?.nombre || 'N/A'}</p>
          <p><strong>Estado:</strong> ${factura.estado}</p>
          <p class="invoice-total">Total: ${formatCurrency(factura.total)}</p>
          <div>
            <p><strong>Detalle:</strong></p>
            <ul>
              ${detalleLista || '<li>Sin detalles</li>'}
            </ul>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderVentasChart = () => {
  if (!ventasCanvas || !state.facturas.length) return;
  const aggregations = {};
  state.facturas.forEach((factura) => {
    const detalles = Array.isArray(factura.detalles) ? factura.detalles : [];
    detalles.forEach((detalle) => {
      const key = detalle.descripcion || `Producto ${detalle.producto_id}`;
      aggregations[key] = (aggregations[key] || 0) + Number(detalle.cantidad || 0);
    });
  });
  const entries = Object.entries(aggregations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  if (!entries.length) {
    updateChart('ventas', ventasCanvas, {
      type: 'bar',
      data: {
        labels: ['Sin datos'],
        datasets: [
          {
            label: 'Unidades vendidas',
            data: [0],
            backgroundColor: '#94a3b8',
          },
        ],
      },
    });
    return;
  }

  updateChart('ventas', ventasCanvas, {
    type: 'bar',
    data: {
      labels: entries.map(([label]) => label),
      datasets: [
        {
          label: 'Unidades vendidas',
          data: entries.map(([, total]) => total),
          backgroundColor: '#f97316',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
};
const renderInvoicePreview = (factura) => {
  const detalles = Array.isArray(factura.detalles) ? factura.detalles : [];
  const detalleRows = detalles
    .map(
      (detalle) => `
        <div class="preview-row">
          <span>${detalle.descripcion || `Producto ${detalle.producto_id}`}</span>
          <span>${detalle.cantidad}</span>
          <span>${formatCurrency(detalle.precio_unitario)}</span>
          <span>${formatCurrency(detalle.subtotal)}</span>
        </div>
      `
    )
    .join('');

  return `
    <article class="invoice-preview">
      <header>
        <div>
          <p class="label">Factura</p>
          <h3>${factura.numero}</h3>
          <p>${formatDate(factura.fecha)}</p>
        </div>
        <div class="preview-summary">
          <p><span>Subtotal</span><strong>${formatCurrency(factura.subtotal)}</strong></p>
          <p><span>IVA</span><strong>${formatCurrency(factura.impuestos)}</strong></p>
          <p class="total"><span>Total</span><strong>${formatCurrency(factura.total)}</strong></p>
        </div>
      </header>
      <section class="preview-body">
        <div>
          <p class="label">Cliente</p>
          <p class="value">${factura.cliente?.nombre || 'N/A'}</p>
          <p class="hint">${factura.cliente?.identificacion || ''}</p>
        </div>
        <div>
          <p class="label">Estado</p>
          <p class="value">${factura.estado}</p>
          ${factura.notas ? `<p class="hint">${factura.notas}</p>` : ''}
        </div>
      </section>
      <section class="preview-table">
        <div class="preview-row header">
          <span>Descripción</span>
          <span>Cant.</span>
          <span>Precio</span>
          <span>Total</span>
        </div>
        ${detalleRows || '<p class="hint">Sin detalles</p>'}
      </section>
    </article>
  `;
};

const syncLinePriceWithProduct = (lineaEl) => {
  if (!lineaEl) return;
  const productoSelect = lineaEl.querySelector('.producto');
  const precioInput = lineaEl.querySelector('.precio');
  if (!productoSelect || !precioInput) return;
  const productId = Number(productoSelect.value);
  if (!productId) return;
  const product = state.productos.find(
    (item) => Number(item.id) === Number(productId)
  );
  if (product) {
    precioInput.value = Number(product.precio).toFixed(2);
  }
};

const setFacturasStatus = (message) => {
  if (!facturasStatus) return;
  facturasStatus.textContent = message || '';
};

const loadData = async () => {
  try {
    setStatus('Sincronizando…');
    const [inventario, clientes, productos] = await Promise.all([
      fetchJson('/inventario'),
      fetchJson('/clientes'),
      fetchJson('/productos'),
    ]);
    state.inventario = inventario;
    state.clientes = clientes;
    state.productos = productos;
    renderInventario();
    renderClientes();
    lineasContainer.innerHTML = renderLineaRow({}, Date.now());
    updateSummary();
    renderInventoryCharts();
    totalProductosEl.textContent = state.productos.length;
    totalClientesEl.textContent = state.clientes.length;
    stockCriticoEl.textContent = state.inventario.filter(
      (item) => item.requiere_reabastecimiento
    ).length;
    lastSyncLabel.textContent = new Date().toLocaleTimeString();
    setStatus('Actualizado', 'success');
  } catch (error) {
    console.error(error);
    setStatus('Error API', 'error');
  }
};

const loadFacturas = async () => {
  try {
    setFacturasStatus('Cargando facturas...');
    const facturas = await fetchJson('/facturas');
    state.facturas = facturas;
    renderFacturas();
    renderVentasChart();
    setFacturasStatus(`Última consulta: ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error(error);
    setFacturasStatus(error.message);
  }
};

facturaForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const clienteId = Number(clienteSelect.value);
  if (!clienteId) {
    alert('Seleccione un cliente');
    return;
  }

  const lineas = getValidLines();
  if (!lineas.length) {
    alert('Agregue al menos un producto con cantidad válida');
    return;
  }

  try {
    facturaForm.querySelector('button[type="submit"]').disabled = true;
    const factura = await fetchJson('/facturas', {
      method: 'POST',
      body: JSON.stringify({ clienteId, lineas, notas: notasInput.value }),
    });
    resultado.innerHTML = renderInvoicePreview(factura);
    await loadData();
    facturaForm.reset();
    lineasContainer.innerHTML = renderLineaRow({}, Date.now());
    updateSummary();
  } catch (error) {
    resultado.innerHTML = `<p class="error">${error.message}</p>`;
  } finally {
    facturaForm.querySelector('button[type="submit"]').disabled = false;
  }
});

lineasContainer.addEventListener('click', (event) => {
  if (event.target.classList.contains('remove')) {
    removeLinea(event.target);
  }
});

lineasContainer.addEventListener('change', (event) => {
  if (event.target.classList.contains('producto')) {
    syncLinePriceWithProduct(event.target.closest('.linea'));
  }
  updateSummary();
});

lineasContainer.addEventListener('input', (event) => {
  if (
    event.target.classList.contains('cantidad') ||
    event.target.classList.contains('precio')
  ) {
    updateSummary();
  }
});

addLineaBtn.addEventListener('click', addLinea);
refreshBtn.addEventListener('click', loadData);

productoForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(productoForm);
  const payload = {
    nombre: formData.get('nombre')?.trim(),
    sku: formData.get('sku')?.trim(),
    precio: Number(formData.get('precio')),
    stock: Number(formData.get('stock')),
    stockMinimo: Number(formData.get('stockMinimo') || 0),
    descripcion: formData.get('descripcion')?.trim(),
  };
  try {
    await fetchJson('/productos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    showFormMessage(productoMessage, 'Producto registrado correctamente', 'success');
    productoForm.reset();
    await loadData();
  } catch (error) {
    showFormMessage(productoMessage, error.message, 'error');
  }
});

clienteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(clienteForm);
  const payload = {
    nombre: formData.get('nombre')?.trim(),
    identificacion: formData.get('identificacion')?.trim(),
    correo: formData.get('correo')?.trim() || undefined,
    telefono: formData.get('telefono')?.trim() || undefined,
    direccion: formData.get('direccion')?.trim() || undefined,
  };
  try {
    await fetchJson('/clientes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    showFormMessage(clienteMessage, 'Cliente registrado correctamente', 'success');
    clienteForm.reset();
    await loadData();
  } catch (error) {
    showFormMessage(clienteMessage, error.message, 'error');
  }
});

loadFacturasBtn?.addEventListener('click', loadFacturas);
setFacturasStatus('Pulsa "Ver facturas" para consultar el historial.');
renderFacturas();

viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;
    if (target) {
      setActiveView(target);
      if (target === 'historial' && !state.facturas.length) {
        loadFacturas();
      }
    }
  });
});

setActiveView(state.currentView);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) =>
    console.warn('No se pudo registrar service worker', err)
  );
}

loadData();
