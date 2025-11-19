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
      `SELECT id, nombre, correo, telefono, direccion, identificacion, creado_en
         FROM clientes
         ORDER BY nombre`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  validate([
    body('nombre').trim().notEmpty().withMessage('nombre requerido'),
    body('identificacion').trim().notEmpty().withMessage('identificacion requerida'),
    body('correo').optional().isEmail().withMessage('correo inválido'),
    body('telefono').optional().isString().isLength({ max: 50 }),
    body('direccion').optional().isString(),
  ]),
  async (req, res, next) => {
    try {
      const { nombre, identificacion, correo, telefono, direccion } = req.body;
      const { rows } = await query(
        `INSERT INTO clientes (nombre, identificacion, correo, telefono, direccion)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nombre, identificacion, correo, telefono, direccion, creado_en`,
        [nombre, identificacion, correo || null, telefono || null, direccion || null]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Identificación ya existe' });
      }
      next(error);
    }
  }
);

module.exports = router;
