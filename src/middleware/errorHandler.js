const { nodeEnv } = require('../config/appConfig');

module.exports = function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const payload = {
    status: 'error',
    message: err.message || 'Error interno en el servicio',
    data: null
  };

  if (nodeEnv !== 'production') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};
