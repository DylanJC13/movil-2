const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db');

const router = express.Router();

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({ errors: errors.array() });
};

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

router.post(
  '/',
  validate([
    body('nombre').trim().notEmpty().withMessage('nombre requerido'),
    body('sku').trim().notEmpty().withMessage('sku requerido'),
    body('precio').isFloat({ gt: 0 }).withMessage('precio inválido'),
    body('stock').isInt({ min: 0 }).withMessage('stock inválido'),
    body('stockMinimo').optional().isInt({ min: 0 }).withMessage('stockMinimo inválido'),
    body('descripcion').optional().isString().isLength({ max: 500 }),
  ]),
  async (req, res, next) => {
    try {
      const { nombre, descripcion, sku, precio, stock, stockMinimo } = req.body;
      const { rows } = await query(
        `INSERT INTO productos (nombre, descripcion, sku, precio, stock, stock_minimo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nombre, descripcion, sku, precio, stock, stock_minimo`,
        [nombre, descripcion || null, sku, precio, stock, stockMinimo ?? 0]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'SKU ya registrado' });
      }
      next(error);
    }
  }
);

module.exports = router;
