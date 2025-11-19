const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, nombre, correo, telefono, direccion, identificacion, creado_en
         FROM clientes
         ORDER BY nombre`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
