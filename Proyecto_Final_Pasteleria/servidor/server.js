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
            return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(contra, user.contra);

        if (isPasswordValid) {
            res.json({ success: true, message: 'Inicio de sesión exitoso.' });
        } else {
            res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
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
    const connection = db.promise();

    connection.beginTransaction(async err => {
        if (err) {
            console.error('Error al iniciar la transacción:', err);
            return res.status(500).json({ success: false, message: 'Error interno del servidor al iniciar transacción.' });
        }

        try {
            const id_usuario_actual = 25;
            const [existingUserCheck] = await connection.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id_usuario_actual]); // Usar 'connection.query'

            if (existingUserCheck.length === 0) {
                console.error(`ERROR DE DEPURACIÓN: Se intentó usar id_usuario=${id_usuario_actual} para una venta, pero NO existe en la tabla 'usuario'.`);
                throw new Error(`El usuario con ID ${id_usuario_actual} no se encuentra en la base de datos 'usuario'. Venta no registrada.`);
            } else {
                console.log(`DEBUG: Usuario con id_usuario=${id_usuario_actual} CONFIRMADO en la tabla 'usuario'.`);
            }

            const [clientes] = await connection.query('SELECT id_cliente FROM cliente WHERE DNI = ?', [dni_cliente]); 
            let id_cliente;

            if (clientes.length > 0) {
                id_cliente = clientes[0].id_cliente;
            } else {
                const [resultCliente] = await connection.query('INSERT INTO cliente (DNI, nombre) VALUES (?, ?)', [dni_cliente, nombre_cliente]); // Usar 'connection.query'
                id_cliente = resultCliente.insertId;
            }

            const [resultVenta] = await connection.query('INSERT INTO venta (id_usuario, id_cliente, fecha, total, metodo_pago) VALUES (?, ?, ?, ?, ?)', [id_usuario_actual, id_cliente, fecha, total, metodo_pago]); // Usar 'connection.query'
            const id_venta = resultVenta.insertId;

            await Promise.all(productos.map(async prod => {
                await connection.query('INSERT INTO detalle_venta (id_venta, id_prod, cantidad, precio_unidad, subTotal) VALUES (?, ?, ?, ?, ?)', [id_venta, prod.id_prod, prod.cantidad, prod.precio_unidad, prod.subTotal]); // Usar 'connection.query'
                await connection.query('UPDATE producto SET stock_actual = stock_actual - ? WHERE id_prod = ?', [prod.cantidad, prod.id_prod]); // Usar 'connection.query'
            }));

            await connection.commit(); 
            res.json({ success: true, message: 'Venta registrada con éxito.', id_venta: id_venta });

        } catch (error) {
            await connection.rollback(); 
            console.error('Error en la transacción de venta:', error);
            res.status(500).json({ success: false, message: error.message || 'Error interno del servidor al registrar la venta.' });
        }
    });
});

app.get('/api/historial-ventas', async (req, res) => {
    try {
        const sql = `
            SELECT v.fecha, c.DNI, c.nombre AS nombre_cliente, v.metodo_pago, v.total
            FROM venta v
            JOIN cliente c ON v.id_cliente = c.id_cliente
            ORDER BY v.fecha DESC
        `;
        const [results] = await db.promise().query(sql);
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Error al obtener historial de ventas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener historial de ventas.' });
    }
});

app.get('/api/reportes-totales', async (req, res) => {
    try {
        const [totalVentasResult] = await db.promise().query('SELECT SUM(total) as total FROM venta');
        const [ventasEfectivoResult] = await db.promise().query('SELECT SUM(total) as total FROM venta WHERE metodo_pago = "efectivo"');
        const [ventasTarjetaResult] = await db.promise().query('SELECT SUM(total) as total FROM venta WHERE metodo_pago = "tarjeta"');

        res.json({
            success: true,
            data: {
                totalVentas: totalVentasResult[0].total || 0,
                ventasEfectivo: ventasEfectivoResult[0].total || 0,
                ventasTarjeta: ventasTarjetaResult[0].total || 0
            }
        });
    } catch (error) {
        console.error('Error al obtener reportes de ventas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reportes de ventas.' });
    }
});

app.get('/api/productos', async (req, res) => {
    try {
        const sql = 'SELECT id_prod, nombre, descripcion, precio, stock_inicial, stock_actual FROM producto';
        const [results] = await db.promise().query(sql);
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener productos del inventario.' });
    }
});

app.post('/api/productos', async (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;

    if (!nombre || !precio || !stock) {
        return res.status(400).json({ success: false, message: 'Nombre, precio y stock son campos obligatorios.' });
    }

    try {
        const query = 'INSERT INTO producto (nombre, descripcion, precio, stock_inicial, stock_actual) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.promise().query(query, [nombre, descripcion, precio, stock, stock]);
        res.status(201).json({ success: true, message: 'Producto añadido exitosamente.', id: result.insertId });
    } catch (error) {
        console.error('Error al añadir producto:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al añadir el producto.' });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock } = req.body;

    if (!nombre || !precio || !stock) {
        return res.status(400).json({ success: false, message: 'Nombre, precio y stock son campos obligatorios para actualizar.' });
    }

    try {
        const query = 'UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, stock_actual = ? WHERE id_prod = ?';
        const [result] = await db.promise().query(query, [nombre, descripcion, precio, stock, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado o no se realizaron cambios.' });
        }

        res.status(200).json({ success: true, message: 'Producto actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el producto.' });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM producto WHERE id_prod = ?';
        const [result] = await db.promise().query(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }

        res.status(200).json({ success: true, message: 'Producto eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar el producto.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});