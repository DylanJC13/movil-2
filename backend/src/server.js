require('dotenv').config();
const app = require('./app');
const { pool } = require('./db');

const PORT = process.env.PORT || 4000;

const gracefulShutdown = () => {
  console.log('Cerrando servidor...');
  pool
    .end()
    .catch((err) => console.error('Error cerrando pool', err))
    .finally(() => process.exit(0));
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

app.listen(PORT, () => {
  console.log(`API de facturación escuchando en el puerto ${PORT}`);
});
