const API_URL_KEY = 'facturacion_api_url';
const apiInput = document.getElementById('apiUrl');
const statusLabel = document.getElementById('status');
const inventarioContainer = document.getElementById('inventario');
const clientesContainer = document.getElementById('clientes');
const clienteSelect = document.getElementById('clienteSelect');
const lineasContainer = document.getElementById('lineas');
const facturaForm = document.getElementById('facturaForm');
const resultado = document.getElementById('facturaResultado');
const notasInput = document.getElementById('notas');
const addLineaBtn = document.getElementById('addLinea');
const saveApiUrlBtn = document.getElementById('saveApiUrl');

const state = {
  apiBase: localStorage.getItem(API_URL_KEY) || 'http://localhost:4000',
  inventario: [],
  clientes: [],
  productos: [],
};

apiInput.value = state.apiBase;

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
          <span class="badge ${item.requiere_reabastecimiento ? 'alert' : ''}">
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

const renderLineaRow = (linea, index) => {
  return `
    <div class="linea" data-index="${index}">
      <label>
        Producto
        <select class="producto" required>
          <option value="">Seleccione...</option>
          ${state.productos
            .map(
              (producto) => `
                <option value="${producto.id}" ${
                  linea?.productoId === producto.id ? 'selected' : ''
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
          linea?.precioUnitario || 0
        }" />
      </label>
      <button type="button" class="remove">Eliminar</button>
    </div>
  `;
};

const renderLineas = () => {
  const lineas = [...lineasContainer.querySelectorAll('.linea')].map((linea) => ({
    productoId: Number(linea.querySelector('.producto').value),
    cantidad: Number(linea.querySelector('.cantidad').value),
    precioUnitario: Number(linea.querySelector('.precio').value),
  }));
  lineasContainer.innerHTML = lineas
    .map((linea, index) => renderLineaRow(linea, index))
    .join('');
  if (!lineas.length) {
    lineasContainer.innerHTML = renderLineaRow({}, 0);
  }
};

const addLinea = () => {
  const linea = document.createElement('div');
  linea.innerHTML = renderLineaRow({}, Date.now());
  lineasContainer.appendChild(linea.firstElementChild);
};

const removeLinea = (target) => {
  if (lineasContainer.children.length === 1) return;
  target.closest('.linea').remove();
};

const loadData = async () => {
  try {
    statusLabel.textContent = 'Sincronizando...';
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
    lineasContainer.innerHTML = renderLineaRow({}, 0);
    statusLabel.textContent = 'Listo';
  } catch (error) {
    console.error(error);
    statusLabel.textContent = 'Error conectando a la API';
  }
};

facturaForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const clienteId = Number(clienteSelect.value);
  if (!clienteId) {
    alert('Seleccione un cliente');
    return;
  }

  const lineas = [...lineasContainer.querySelectorAll('.linea')]
    .map((linea) => ({
      productoId: Number(linea.querySelector('.producto').value),
      cantidad: Number(linea.querySelector('.cantidad').value),
      precioUnitario: Number(linea.querySelector('.precio').value),
    }))
    .filter((linea) => linea.productoId && linea.cantidad > 0);

  if (!lineas.length) {
    alert('Agregue al menos un producto');
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
      <p>Total: <strong>$${factura.total}</strong></p>
      <pre>${JSON.stringify(factura, null, 2)}</pre>
    `;
    loadData();
    facturaForm.reset();
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

addLineaBtn.addEventListener('click', addLinea);
saveApiUrlBtn.addEventListener('click', () => {
  state.apiBase = apiInput.value.trim();
  localStorage.setItem(API_URL_KEY, state.apiBase);
  statusLabel.textContent = 'URL guardada';
  loadData();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) =>
    console.warn('No se pudo registrar service worker', err)
  );
}

loadData();
