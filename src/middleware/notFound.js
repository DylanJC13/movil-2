module.exports = function notFoundHandler(req, res, next) {
  res.status(404).json({
    status: 'error',
    message: `La ruta ${req.originalUrl} no existe en la API`,
    data: null
  });
};
