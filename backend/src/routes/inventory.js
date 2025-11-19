const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, nombre, sku, stock, stock_minimo, precio,
              CASE WHEN stock <= stock_minimo THEN true ELSE false END AS requiere_reabastecimiento
         FROM productos
         ORDER BY nombre`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
