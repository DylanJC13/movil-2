CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    identificacion VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(150),
    telefono VARCHAR(50),
    direccion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    precio NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS factura_numero_seq START 1000;

CREATE TABLE IF NOT EXISTS facturas (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(30) UNIQUE NOT NULL DEFAULT (
        'FAC-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('factura_numero_seq')::TEXT, 5, '0')
    ),
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    subtotal NUMERIC(12,2) NOT NULL,
    impuestos NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    notas TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'GENERADA',
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_factura (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_detalle_factura_factura ON detalle_factura (factura_id);

INSERT INTO clientes (nombre, identificacion, correo, telefono, direccion)
VALUES
    ('Comercial Andina', 'RUC-099999999', 'contacto@andina.com', '+593 2 222 1111', 'Av. Libertad 123'),
    ('Servicios Globales', 'RUC-088888888', 'ventas@globales.com', '+593 4 444 3333', 'Calle 10 #23')
ON CONFLICT (identificacion) DO NOTHING;

INSERT INTO productos (nombre, descripcion, sku, precio, stock, stock_minimo)
VALUES
    ('Kit de mantenimiento', 'Paquete preventivo anual', 'KIT-001', 120.00, 50, 5),
    ('Sensor IoT', 'Sensor multipropósito', 'SEN-002', 80.00, 30, 10),
    ('Licencia Software', 'Renovación anual', 'LIC-003', 250.00, 100, 20)
ON CONFLICT (sku) DO NOTHING;
