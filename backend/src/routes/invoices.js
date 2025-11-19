const express = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  createInvoice,
  getInvoiceById,
  listInvoices,
} = require('../services/invoiceService');

const router = express.Router();

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({ errors: errors.array() });
};

router.get('/', async (req, res, next) => {
  try {
    const invoices = await listInvoices();
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  validate([
    body('clienteId').isInt({ gt: 0 }).withMessage('clienteId requerido'),
    body('lineas')
      .isArray({ min: 1 })
      .withMessage('Debe enviar al menos una línea de detalle'),
    body('lineas.*.productoId')
      .isInt({ gt: 0 })
      .withMessage('productoId inválido'),
    body('lineas.*.cantidad')
      .isInt({ gt: 0 })
      .withMessage('cantidad debe ser mayor a cero'),
    body('lineas.*.precioUnitario')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('precioUnitario debe ser mayor a cero'),
    body('notas').optional().isString().isLength({ max: 500 }),
  ]),
  async (req, res, next) => {
    try {
      const invoice = await createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  validate([param('id').isInt({ gt: 0 }).withMessage('Id inválido')]),
  async (req, res, next) => {
    try {
      const invoice = await getInvoiceById(req.params.id);
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
