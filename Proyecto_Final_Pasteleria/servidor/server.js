// server.js (MODIFICADO)

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vladydb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error al obtener una conexión del pool:', err.stack);
        console.error('Verifica que MySQL/MariaDB esté corriendo y que las credenciales sean correctas.');
        process.exit(1);
    }
    console.log('Pool de base de datos MySQL creado y listo para usar.');
    connection.release();
    connection.promise().query('SELECT id_usuario, correo, dni, nombre FROM usuario')
        .then(([rows]) => {
            console.log('Usuarios encontrados en la BD a través de la aplicación al inicio:', rows);
        })
        .catch(queryErr => {
            console.error('Error al verificar usuarios desde la aplicación al inicio:', queryErr);
        });
});

app.post('/register', async (req, res) => {
    const { dni, nombre, apellido, telefono, correo, contra } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(contra, 10);
        const [result] = await db.promise().query(
            'INSERT INTO usuario (dni, nombre, apellido, telefono, correo, contra) VALUES (?, ?, ?, ?, ?, ?)',
            [dni, nombre, apellido, telefono, correo, hashedPassword]
        );
        res.status(201).json({ success: true, message: 'Usuario registrado con éxito', userId: result.insertId });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, message: 'El DNI o el correo ya están registrados.' });
        } else {
            res.status(500).json({ success: false, message: 'Error interno del servidor al registrar usuario.' });
        }
    }
});

app.post('/login', async (req, res) => {
    const { correo, contra } = req.body;
    try {
        const [rows] = await db.promise().query('SELECT * FROM usuario WHERE correo = ?', [correo]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas. Correo no encontrado.' });
        }
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(contra, user.contra);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas. Contraseña incorrecta.' });
        }
        res.status(200).json({ success: true, message: 'Login exitoso', userId: user.id_usuario, user: { id: user.id_usuario, nombre: user.nombre, correo: user.correo, rol: user.rol } });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al iniciar sesión.' });
    }
});

app.get('/api/productos', async (req, res) => {
    console.log('--- Solicitud GET /api/productos recibida ---');
    try {
        // Se mantiene esta ruta para obtener solo productos activos para la venta/inventario
        const [rows] = await db.promise().query('SELECT * FROM producto WHERE estado = "activo"');
        console.log('Productos activos obtenidos de la BD:', rows.length);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener productos activos:', error);
        res.status(500).json({ success: false, message: 'Error al cargar productos del inventario.' });
    }
});

app.post('/api/productos', async (req, res) => {
    console.log('--- Solicitud POST /api/productos recibida ---');
    const { nombre, descripcion, precio, stock } = req.body;
    if (!nombre || !precio || !stock) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: nombre, precio, stock.' });
    }
    const parsedPrecio = parseFloat(precio);
    const parsedStock = parseInt(stock, 10);

    if (isNaN(parsedPrecio) || parsedPrecio < 0 || isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ success: false, message: 'Precio y stock deben ser números válidos y no negativos.' });
    }

    try {
        const [result] = await db.promise().query(
            'INSERT INTO producto (nombre, descripcion, precio, stock_inicial, stock_actual) VALUES (?, ?, ?, ?, ?)',
            [nombre, descripcion, parsedPrecio, parsedStock, parsedStock]
        );
        console.log('Producto añadido a la BD:', result);
        res.status(201).json({ success: true, message: 'Producto añadido exitosamente!', id: result.insertId });
    } catch (error) {
        console.error('Error al añadir producto:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al añadir el producto.' });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    console.log(`--- Solicitud PUT /api/productos/${req.params.id} recibida ---`);
    const { id } = req.params;
    const { nombre, descripcion, precio, stock } = req.body;

    if (!nombre || !precio || !stock) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: nombre, precio, stock.' });
    }
    const parsedPrecio = parseFloat(precio);
    const parsedStock = parseInt(stock, 10);

    if (isNaN(parsedPrecio) || parsedPrecio < 0 || isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ success: false, message: 'Precio y stock deben ser números válidos y no negativos.' });
    }

    try {
        const [result] = await db.promise().query(
            'UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, stock_actual = ? WHERE id_prod = ?',
            [nombre, descripcion, parsedPrecio, parsedStock, id]
        );

        if (result.affectedRows === 0) {
            console.log(`Producto con ID ${id} no encontrado para actualización.`);
            return res.status(404).json({ success: false, message: 'Producto no encontrado para actualizar.' });
        }
        console.log('Producto actualizado en la BD:', result);
        res.json({ success: true, message: 'Producto actualizado exitosamente!' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el producto.' });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    console.log(`--- Solicitud DELETE (lógica) /api/productos/${req.params.id} recibida ---`);
    const { id } = req.params;
    const { usuario_id, razon_eliminacion = 'Sin especificar' } = req.body;

    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const [productToLog] = await connection.query('SELECT nombre, descripcion, precio, stock_actual FROM producto WHERE id_prod = ?', [id]);

        if (productToLog.length === 0) {
            await connection.rollback();
            console.log(`Producto con ID ${id} no encontrado para eliminación lógica.`);
            return res.status(404).json({ success: false, message: 'Producto no encontrado para eliminar.' });
        }

        const originalProduct = productToLog[0];

        await connection.query(
            'INSERT INTO productos_eliminados_log (id_prod_original, nombre_original, descripcion_original, precio_original, stock_actual_original, eliminado_por_usuario_id, razon_eliminacion) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, originalProduct.nombre, originalProduct.descripcion, originalProduct.precio, originalProduct.stock_actual, usuario_id, razon_eliminacion]
        );
        console.log('Registro de eliminación creado en productos_eliminados_log.');

        const [result] = await connection.query(
            'UPDATE producto SET estado = ?, stock_actual = 0 WHERE id_prod = ?',
            ['inactivo', id]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            console.log(`Producto con ID ${id} no encontrado para actualización de estado.`);
            return res.status(404).json({ success: false, message: 'Producto no encontrado para eliminar lógicamente.' });
        }

        await connection.commit();
        console.log(`Producto con ID ${id} marcado como inactivo exitosamente y registrado en el historial.`);
        res.json({ success: true, message: 'Producto eliminado lógicamente y registrado en el historial!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al realizar eliminación lógica de producto:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar el producto lógicamente.' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/productos-eliminados', async (req, res) => {
    console.log('--- Solicitud GET /api/productos-eliminados recibida ---');
    try {
        const [rows] = await db.promise().query(`
            SELECT
                pel.id_log,
                pel.id_prod_original,
                pel.nombre_original AS nombre_producto,
                pel.descripcion_original,
                pel.precio_original,
                pel.stock_actual_original,
                u.nombre AS nombre_usuario_elimino,
                pel.fecha_eliminacion,
                pel.razon_eliminacion
            FROM
                productos_eliminados_log pel
            JOIN
                usuario u ON pel.eliminado_por_usuario_id = u.id_usuario
            ORDER BY
                pel.fecha_eliminacion DESC
        `);
        console.log('Registros de productos eliminados obtenidos de la BD:', rows.length);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener productos eliminados:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener productos eliminados.' });
    }
});


app.post('/api/registrar-venta', async (req, res) => {
    console.log('--- Solicitud POST /api/registrar-venta recibida ---');
    console.log('Cuerpo de la solicitud (req.body):', req.body);
    const { fecha, dni_cliente, nombre_cliente, metodo_pago, total, productos, id_usuario_venta } = req.body;

    if (!id_usuario_venta) {
        console.error('Error: id_usuario_venta no proporcionado en la solicitud.');
        return res.status(400).json({ success: false, message: 'ID del usuario que realiza la venta es requerido.' });
    }
    const id_usuario_actual = id_usuario_venta;

    let connection;
    try {
        console.log('Iniciando obtención de conexión del pool para venta...');
        connection = await db.promise().getConnection();
        console.log('Conexión a la BD obtenida exitosamente para venta.');
        await connection.beginTransaction();
        console.log('Transacción de venta iniciada.');
        console.log(`Intentando verificar usuario con ID: ${id_usuario_actual}`);
        const [existingUserCheck] = await connection.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id_usuario_actual]);
        console.log('Resultado de la consulta de verificación de usuario para venta:', existingUserCheck);
        console.log('Longitud del resultado de usuario para venta:', existingUserCheck.length);

        if (existingUserCheck.length === 0) {
            throw new Error(`Error: El usuario con ID ${id_usuario_actual} no se encuentra en la base de datos 'usuario'. Venta no registrada.`);
        }
        console.log('Usuario con ID', id_usuario_actual, 'encontrado. Continuando con la venta.');

        let id_cliente;
        const [existingClient] = await connection.query('SELECT id_cliente FROM cliente WHERE DNI = ?', [dni_cliente]);

        if (existingClient.length > 0) {
            id_cliente = existingClient[0].id_cliente;
            console.log('Cliente existente encontrado con ID:', id_cliente);
        } else {
            const [newClientResult] = await connection.query('INSERT INTO cliente (DNI, nombre) VALUES (?, ?)', [dni_cliente, nombre_cliente]);
            id_cliente = newClientResult.insertId;
            console.log('Nuevo cliente insertado con ID:', id_cliente);
        }

        const [ventaResult] = await connection.query(
            'INSERT INTO venta (id_usuario, id_cliente, fecha, total, metodo_pago) VALUES (?, ?, ?, ?, ?)',
            [id_usuario_actual, id_cliente, fecha, total, metodo_pago]
        );
        const id_venta = ventaResult.insertId;
        console.log('Venta insertada con ID:', id_venta);

        for (const prod of productos) {
            const [productStock] = await connection.query('SELECT stock_actual FROM producto WHERE id_prod = ? AND estado = "activo"', [prod.id_prod]);
            if (productStock.length === 0 || productStock[0].stock_actual < prod.cantidad) {
                throw new Error(`Stock insuficiente o producto inactivo para el producto ${prod.nombre}.`);
            }
            await connection.query(
                'INSERT INTO detalle_venta (id_venta, id_prod, cantidad, precio_unidad, subTotal) VALUES (?, ?, ?, ?, ?)',
                [id_venta, prod.id_prod, prod.cantidad, prod.precio_unidad, prod.subTotal]
            );
            console.log(`Detalle de venta insertado para producto ${prod.id_prod}.`);

            await connection.query(
                'UPDATE producto SET stock_actual = stock_actual - ? WHERE id_prod = ?',
                [prod.cantidad, prod.id_prod]
            );
            console.log(`Stock actualizado para producto ${prod.id_prod}.`);
        }

        await connection.commit();
        console.log('Transacción de venta confirmada con éxito.');
        res.json({ success: true, message: 'Venta registrada con éxito.', id_venta: id_venta });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            console.log('Transacción de venta revertida debido a un error.');
        }
        console.error('Error en la transacción de venta:', error);
        res.status(500).json({ success: false, message: error.message || 'Error interno del servidor al registrar la venta.' });
    } finally {
        if (connection) {
            connection.release();
            console.log('Conexión a la BD liberada.');
        }
    }
});

// Ruta para obtener historial de pedidos con filtros (sin cambios aquí desde la última vez)
app.get('/api/historial-pedidos', async (req, res) => {
    console.log('--- Solicitud GET /api/historial-pedidos recibida ---');
    const { fechaInicio, fechaFin, dniCliente } = req.query;

    let query = `
        SELECT
            v.id_venta,
            v.fecha,
            c.DNI AS dni_cliente,
            c.nombre AS nombre_cliente,
            v.total,
            v.metodo_pago,
            u.nombre AS nombre_usuario_venta
        FROM
            venta v
        JOIN
            cliente c ON v.id_cliente = c.id_cliente
        JOIN
            usuario u ON v.id_usuario = u.id_usuario
        WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
        query += ` AND v.fecha >= ?`;
        params.push(fechaInicio + ' 00:00:00');
    }
    if (fechaFin) {
        query += ` AND v.fecha <= ?`;
        params.push(fechaFin + ' 23:59:59');
    }
    if (dniCliente) {
        query += ` AND c.DNI = ?`;
        params.push(dniCliente);
    }

    query += ` ORDER BY v.fecha DESC, v.id_venta DESC`;

    try {
        const [ventas] = await db.promise().query(query, params);

        for (const venta of ventas) {
            const [productosVendidos] = await db.promise().query(`
                SELECT
                    dv.cantidad,
                    dv.precio_unidad,
                    dv.subTotal,
                    p.nombre AS nombre_producto
                FROM
                    detalle_venta dv
                JOIN
                    producto p ON dv.id_prod = p.id_prod
                WHERE
                    dv.id_venta = ?
            `, [venta.id_venta]);
            venta.productos = productosVendidos;
        }

        console.log('Historial de pedidos con detalles de productos obtenido de la BD:', ventas.length, 'ventas.');
        res.json({ success: true, data: ventas });
    } catch (error) {
        console.error('Error al obtener historial de pedidos con detalles y filtros:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener historial de pedidos.' });
    }
});

// MODIFICACIÓN: Ruta para obtener reportes totales y los nuevos indicadores
app.get('/api/reportes-totales', async (req, res) => {
    console.log('--- Solicitud GET /api/reportes-totales recibida ---');
    const { fechaInicio, fechaFin, dniCliente } = req.query;

    let baseQuery = `FROM venta v JOIN cliente c ON v.id_cliente = c.id_cliente WHERE 1=1`;
    const params = [];

    if (fechaInicio) {
        baseQuery += ` AND v.fecha >= ?`;
        params.push(fechaInicio + ' 00:00:00');
    }
    if (fechaFin) {
        baseQuery += ` AND v.fecha <= ?`;
        params.push(fechaFin + ' 23:59:59');
    }
    if (dniCliente) {
        baseQuery += ` AND c.DNI = ?`;
        params.push(dniCliente);
    }

    try {
        // --- Indicadores Existentes ---
        const [totalVentasResult] = await db.promise().query(`SELECT SUM(v.total) AS total ${baseQuery}`, params);
        const totalVentas = totalVentasResult[0].total || 0;

        const [ventasEfectivoResult] = await db.promise().query(`SELECT SUM(v.total) AS total ${baseQuery} AND v.metodo_pago = 'efectivo'`, params);
        const ventasEfectivo = ventasEfectivoResult[0].total || 0;

        const [ventasTarjetaResult] = await db.promise().query(`SELECT SUM(v.total) AS total ${baseQuery} AND v.metodo_pago = 'tarjeta'`, params);
        const ventasTarjeta = ventasTarjetaResult[0].total || 0;

        const [ventasYapeResult] = await db.promise().query(`SELECT SUM(v.total) AS total ${baseQuery} AND v.metodo_pago = 'yape'`, params);
        const ventasYape = ventasYapeResult[0].total || 0;

        const [ventasPlinResult] = await db.promise().query(`SELECT SUM(v.total) AS total ${baseQuery} AND v.metodo_pago = 'plin'`, params);
        const ventasPlin = ventasPlinResult[0].total || 0;

        const [promedioVentasResult] = await db.promise().query(`SELECT AVG(v.total) AS promedio ${baseQuery}`, params);
        const promedioVentas = promedioVentasResult[0].promedio || 0;


        // --- NUEVOS INDICADORES ---

        // 1. Stock Total de Productos Activos
        const [stockTotalResult] = await db.promise().query('SELECT SUM(stock_actual) AS totalStock FROM producto WHERE estado = "activo"');
        const stockTotal = stockTotalResult[0].totalStock || 0;

        // 2. Ingreso Diario Total (Hoy)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const [ingresoDiarioResult] = await db.promise().query(
            `SELECT SUM(total) AS dailyTotal FROM venta WHERE fecha >= ? AND fecha <= ?`,
            [todayStr + ' 00:00:00', todayStr + ' 23:59:59']
        );
        const ingresoDiario = ingresoDiarioResult[0].dailyTotal || 0;

        // 3. Ingreso Semanal Total (Últimos 7 días, incluyendo hoy)
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); // -6 para incluir el día actual y los 6 anteriores
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

        const [ingresoSemanalResult] = await db.promise().query(
            `SELECT SUM(total) AS weeklyTotal FROM venta WHERE fecha >= ? AND fecha <= ?`,
            [sevenDaysAgoStr + ' 00:00:00', todayStr + ' 23:59:59']
        );
        const ingresoSemanal = ingresoSemanalResult[0].weeklyTotal || 0;

        // 4. Venta Promedio Semanal (Promedio de ventas en los últimos 7 días)
        // Calculamos el promedio de ventas por día en los últimos 7 días con datos
        const [ventasSemanaResult] = await db.promise().query(
            `SELECT COUNT(DISTINCT DATE(fecha)) AS diasConVentas, SUM(total) AS totalVentasSemana
             FROM venta
             WHERE fecha >= ? AND fecha <= ?`,
            [sevenDaysAgoStr + ' 00:00:00', todayStr + ' 23:59:59']
        );

        let ventaPromedioSemanal = 0;
        if (ventasSemanaResult[0].diasConVentas > 0) {
            ventaPromedioSemanal = ventasSemanaResult[0].totalVentasSemana / ventasSemanaResult[0].diasConVentas;
        }

        const reportesData = {
            totalVentas: totalVentas,
            ventasEfectivo: ventasEfectivo,
            ventasTarjeta: ventasTarjeta,
            ventasYape: ventasYape,
            ventasPlin: ventasPlin,
            promedioVentas: promedioVentas,
            // Nuevos indicadores
            stockTotal: stockTotal,
            ingresoDiario: ingresoDiario,
            ingresoSemanal: ingresoSemanal,
            ventaPromedioSemanal: ventaPromedioSemanal,
        };

        console.log('Datos de reportes totales obtenidos con filtros y nuevos indicadores:', reportesData);
        res.json({ success: true, data: reportesData });

    } catch (error) {
        console.error('Error al obtener reportes totales con filtros y nuevos indicadores:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener reportes totales.' });
    }
});

app.use((req, res) => {
    console.warn(`404 Not Found para la ruta: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, message: "Ruta no encontrada." });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});