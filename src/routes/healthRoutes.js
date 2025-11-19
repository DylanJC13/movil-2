const { Router } = require('express');
const { apiVersion } = require('../config/appConfig');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API de soporte para Computación Móvil',
    version: apiVersion,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
