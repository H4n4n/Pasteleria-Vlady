const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt'); 
const app = express();
const port = process.env.PORT || 3000; 
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'vladydb',
    ssl: false 
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.stack);
        process.exit(1); 
    }
    console.log('Conectado a la base de datos MySQL.');
});

app.use(express.static(path.join(__dirname, 'public'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/register', async (req, res) => {
    const { dni, nombre, apellido, telefono, correo, contra } = req.body;

    if (!dni || !nombre || !apellido || !telefono || !correo || !contra) {
        return res.status(400).json({ success: false, message: 'Todos los campos son requeridos para el registro.' });
    }

    try {
        const [existingUsersByEmail] = await db.promise().query('SELECT correo FROM usuario WHERE correo = ?', [correo]);
        if (existingUsersByEmail.length > 0) {
            return res.status(409).json({ success: false, message: 'El correo ya está registrado. Intenta con otro.' });
        }
        const [existingUsersByDNI] = await db.promise().query('SELECT dni FROM usuario WHERE dni = ?', [dni]);
        if (existingUsersByDNI.length > 0) {
            return res.status(409).json({ success: false, message: 'El DNI ya está registrado. Intenta con otro.' });
        }
        const hashedPassword = await bcrypt.hash(contra, 10); 
        const insertQuery = `
            INSERT INTO usuario (dni, nombre, apellido, telefono, correo, contra)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.promise().query(insertQuery, [dni, nombre, apellido, telefono, correo, hashedPassword]);

        res.status(201).json({ success: true, message: 'Usuario registrado con éxito.' });
    } catch (error) {
        console.error('Error en el registro de usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Ya existe una entrada con este valor único.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al intentar registrar el usuario.' });
    }
});

app.post('/login', async (req, res) => { 
    const { correo, contra } = req.body;

    if (!correo || !contra) {
        return res.status(400).json({ success: false, message: 'Por favor, ingresa correo y contraseña.' });
    }

    try {
        const sql = 'SELECT id_usuario, correo, contra FROM usuario WHERE correo = ?';
        const [results] = await db.promise().query(sql, [correo]);

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' }); //
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(contra, user.contra);

        if (isPasswordValid) {
            res.json({ success: true, message: 'Inicio de sesión exitoso.' });
        } else {
            res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' }); //
        }
    } catch (error) {
        console.error('Error en la consulta de login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

app.post('/api/registrar-venta', (req, res) => {
    const { fecha, dni_cliente, nombre_cliente, metodo_pago, total, productos } = req.body;

    if (!fecha || !dni_cliente || !nombre_cliente || !metodo_pago || total === undefined || !productos || productos.length === 0) {
        return res.status(400).json({ success: false, message: 'Datos de venta incompletos.' });
    }

    db.beginTransaction(err => {
        if (err) {
            console.error('Error al iniciar la transacción:', err);
            return res.status(500).json({ success: false, message: 'Error interno del servidor al iniciar transacción.' });
        }

        const sqlSelectCliente = 'SELECT id_cliente FROM cliente WHERE DNI = ?';
        db.query(sqlSelectCliente, [dni_cliente], (err, clientes) => {
            if (err) {
                db.rollback(() => {
                    console.error('Error al buscar cliente:', err);
                    res.status(500).json({ success: false, message: 'Error interno del servidor al buscar cliente.' });
                });
                return;
            }

            let id_cliente;
            const insertOrUpdateCliente = (callback) => {
                if (clientes.length > 0) {
                    id_cliente = clientes[0].id_cliente;
                    callback(null);
                } else {
                    const sqlInsertCliente = 'INSERT INTO cliente (DNI, nombre) VALUES (?, ?)';
                    db.query(sqlInsertCliente, [dni_cliente, nombre_cliente], (err, resultCliente) => {
                        if (err) {
                            return callback(err);
                        }
                        id_cliente = resultCliente.insertId;
                        callback(null);
                    });
                }
            };

            insertOrUpdateCliente(err => {
                if (err) {
                    db.rollback(() => {
                        console.error('Error al insertar cliente:', err);
                        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar cliente.' });
                    });
                    return;
                }

                const id_usuario_actual = 1; 

                const sqlInsertVenta = 'INSERT INTO venta (id_usuario, id_cliente, fecha, total, metodo_pago) VALUES (?, ?, ?, ?, ?)';
                db.query(sqlInsertVenta, [id_usuario_actual, id_cliente, fecha, total, metodo_pago], (err, resultVenta) => {
                    if (err) {
                        db.rollback(() => {
                            console.error('Error al insertar venta:', err);
                            res.status(500).json({ success: false, message: 'Error interno del servidor al registrar venta.' });
                        });
                        return;
                    }
                    const id_venta = resultVenta.insertId;

                    const productPromises = productos.map(prod => {
                        return new Promise((resolve, reject) => {
                            const sqlInsertDetalle = 'INSERT INTO detalle_venta (id_venta, id_prod, cantidad, precio_unidad, subTotal) VALUES (?, ?, ?, ?, ?)';
                            db.query(sqlInsertDetalle, [id_venta, prod.id_prod, prod.cantidad, prod.precio_unidad, prod.subTotal], (err) => {
                                if (err) return reject(err);

                                const sqlUpdateStock = 'UPDATE producto SET stock_actual = stock_actual - ? WHERE id_prod = ?';
                                db.query(sqlUpdateStock, [prod.cantidad, prod.id_prod], (err) => {
                                    if (err) return reject(err);
                                    resolve();
                                });
                            });
                        });
                    });

                    Promise.all(productPromises)
                        .then(() => {
                            db.commit(err => {
                                if (err) {
                                    db.rollback(() => {
                                        console.error('Error al hacer commit de la transacción:', err);
                                        res.status(500).json({ success: false, message: 'Error interno del servidor al confirmar venta.' });
                                    });
                                    return;
                                }
                                res.json({ success: true, message: 'Venta registrada con éxito.', id_venta: id_venta });
                            });
                        })
                        .catch(err => {
                            db.rollback(() => {
                                console.error('Error al procesar detalles de venta o actualizar stock:', err);
                                res.status(500).json({ success: false, message: 'Error interno del servidor al procesar productos de venta.' });
                            });
                        });
                });
            });
        });
    });
});

app.get('/api/productos', (req, res) => {
    const sql = 'SELECT id_prod, nombre, descripcion, precio, stock_actual FROM producto';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener productos:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener productos del inventario.' });
        }
        res.json({ success: true, data: results });
    });
});

app.get('/api/historial-ventas', (req, res) => {
    const sql = `
        SELECT v.fecha, c.DNI, c.nombre AS nombre_cliente, v.metodo_pago, v.total
        FROM venta v
        JOIN cliente c ON v.id_cliente = c.id_cliente
        ORDER BY v.fecha DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener historial de ventas:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener historial de ventas.' });
        }
        res.json({ success: true, data: results });
    });
});

app.get('/api/reportes-totales', (req, res) => {
    const sqlTotalVentas = 'SELECT SUM(total) as total FROM venta';
    const sqlVentasEfectivo = 'SELECT SUM(total) as total FROM venta WHERE metodo_pago = "efectivo"';
    const sqlVentasTarjeta = 'SELECT SUM(total) as total FROM venta WHERE metodo_pago = "tarjeta"';

    db.query(sqlTotalVentas, (err, totalVentasResult) => {
        if (err) {
            console.error('Error al obtener total de ventas:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener reportes de ventas.' });
        }
        db.query(sqlVentasEfectivo, (err, ventasEfectivoResult) => {
            if (err) {
                console.error('Error al obtener ventas en efectivo:', err);
                return res.status(500).json({ success: false, message: 'Error al obtener reportes de ventas.' });
            }
            db.query(sqlVentasTarjeta, (err, ventasTarjetaResult) => {
                if (err) {
                    console.error('Error al obtener ventas con tarjeta:', err);
                    return res.status(500).json({ success: false, message: 'Error al obtener reportes de ventas.' });
                }

                res.json({
                    success: true,
                    data: {
                        totalVentas: totalVentasResult[0].total || 0,
                        ventasEfectivo: ventasEfectivoResult[0].total || 0,
                        ventasTarjeta: ventasTarjetaResult[0].total || 0
                    }
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});