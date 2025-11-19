const DEFAULT_API_BASE =
  'https://movil-2-qna8j.ondigitalocean.app/movil-2-backend';
const IVA_RATE = 0.12;
const currencyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
});
const formatCurrency = (value = 0) => currencyFormatter.format(Number(value) || 0);

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

const state = {
  apiBase: DEFAULT_API_BASE,
  inventario: [],
  clientes: [],
  productos: [],
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

const fetchJson = async (path, options = {}) => {
  const url = `${state.apiBase}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
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
    resultado.innerHTML = `
      <h3>Factura generada</h3>
      <p>Número: <strong>${factura.numero}</strong></p>
      <p>Subtotal: <strong>${formatCurrency(factura.subtotal)}</strong></p>
      <p>IVA: <strong>${formatCurrency(factura.impuestos)}</strong></p>
      <p>Total: <strong>${formatCurrency(factura.total)}</strong></p>
      <pre>${JSON.stringify(factura, null, 2)}</pre>
    `;
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) =>
    console.warn('No se pudo registrar service worker', err)
  );
}

loadData();
