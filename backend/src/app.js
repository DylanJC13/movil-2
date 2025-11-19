const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const productsRouter = require('./routes/products');
const inventoryRouter = require('./routes/inventory');
const clientsRouter = require('./routes/clients');
const invoicesRouter = require('./routes/invoices');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/productos', productsRouter);
app.use('/inventario', inventoryRouter);
app.use('/clientes', clientsRouter);
app.use('/facturas', invoicesRouter);

app.use((req, res, next) => {
  res.status(404).json({ message: 'Recurso no encontrado' });
});

app.use(errorHandler);

module.exports = app;
