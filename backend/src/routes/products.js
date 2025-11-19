const express = require('express');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, nombre, descripcion, precio, stock, sku, actualizado_en
         FROM productos
         ORDER BY nombre`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT id, nombre, descripcion, precio, stock, sku, actualizado_en
         FROM productos
         WHERE id = $1`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
