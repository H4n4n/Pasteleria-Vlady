const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vladydb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error al obtener una conexión del pool:', err.stack);
        console.error('Verifica que MySQL/MariaDB esté corriendo y que las credenciales sean correctas en .env o configuración.');
        process.exit(1);
    }
    console.log('Pool de base de datos MySQL creado y listo para usar.');
    connection.release();

    connection.promise().query('SELECT id_usuario, correo, dni, nombre FROM usuario LIMIT 1')
        .then(([rows]) => {
            console.log('Verificación inicial de conexión y consulta a la BD exitosa. Usuarios (ejemplo):', rows);
        })
        .catch(queryErr => {
            console.error('Error en la verificación inicial de usuarios desde la aplicación al inicio:', queryErr);
        });
});

app.use((err, req, res, next) => {
    console.error('Error no capturado:', err.stack);
    res.status(500).json({ success: false, message: 'Error interno del servidor. Por favor, inténtalo de nuevo más tarde.' });
});

app.post('/register', async (req, res) => {
    const { dni, nombre, apellido, telefono, correo, contra } = req.body;

    if (!dni || !nombre || !apellido || !telefono || !correo || !contra) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para el registro.' });
    }

    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

    if (!specialCharRegex.test(contra)) {
        return res.status(400).json({ success: false, message: 'La contraseña debe contener al menos un caracter especial (!@#$%^&*()_+...).' });
    }

    if (contra.length < 8) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

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
        } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            res.status(400).json({ success: false, message: 'Uno de los valores proporcionados no es válido para el campo.' });
        }
        else {
            res.status(500).json({ success: false, message: 'Error interno del servidor al registrar usuario.' });
        }
    }
});

app.post('/login', async (req, res) => {
    const { correo, contra } = req.body;

    if (!correo || !contra) {
        return res.status(400).json({ success: false, message: 'Correo y contraseña son obligatorios.' });
    }

    try {
        const [rows] = await db.promise().query('SELECT id_usuario, nombre, correo, rol, contra FROM usuario WHERE correo = ?', [correo]);
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
        const [rows] = await db.promise().query('SELECT id_prod, nombre, descripcion, precio, stock_actual, imagen_url, estado FROM producto WHERE estado = "activo"');
        console.log('Productos activos obtenidos de la BD:', rows.length);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener productos activos:', error);
        res.status(500).json({ success: false, message: 'Error al cargar productos del inventario.' });
    }
});

app.post('/api/productos', async (req, res) => {
    console.log('--- Solicitud POST /api/productos recibida ---');
    const { nombre, descripcion, precio, stock, imagen_url } = req.body;

    if (!nombre || precio === undefined || stock === undefined) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: nombre, precio, stock.' });
    }
    const parsedPrecio = parseFloat(precio);
    const parsedStock = parseInt(stock, 10);

    if (isNaN(parsedPrecio) || parsedPrecio < 0 || isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ success: false, message: 'Precio y stock deben ser números válidos y no negativos.' });
    }

    try {
        const [result] = await db.promise().query(
            'INSERT INTO producto (nombre, descripcion, precio, stock_inicial, stock_actual, imagen_url) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, descripcion, parsedPrecio, parsedStock, parsedStock, imagen_url || null]
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
    const { nombre, descripcion, precio, stock, imagen_url } = req.body;

    if (!nombre || precio === undefined || stock === undefined) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: nombre, precio, stock.' });
    }
    const parsedPrecio = parseFloat(precio);
    const parsedStock = parseInt(stock, 10);

    if (isNaN(parsedPrecio) || parsedPrecio < 0 || isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ success: false, message: 'Precio y stock deben ser números válidos y no negativos.' });
    }

    try {
        const [result] = await db.promise().query(
            'UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, stock_actual = ?, imagen_url = ? WHERE id_prod = ?',
            [nombre, descripcion, parsedPrecio, parsedStock, imagen_url || null, id]
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

    if (!usuario_id) {
        return res.status(400).json({ success: false, message: 'ID del usuario que realiza la eliminación es requerido.' });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const [productToLog] = await connection.query('SELECT nombre, descripcion, precio, stock_actual, imagen_url FROM producto WHERE id_prod = ?', [id]);

        if (productToLog.length === 0) {
            await connection.rollback();
            console.log(`Producto con ID ${id} no encontrado para eliminación lógica.`);
            return res.status(404).json({ success: false, message: 'Producto no encontrado para eliminar.' });
        }

        const originalProduct = productToLog[0];

        await connection.query(
            'INSERT INTO productos_eliminados_log (id_prod_original, nombre_original, descripcion_original, precio_original, stock_actual_original, imagen_url_original, eliminado_por_usuario_id, razon_eliminacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, originalProduct.nombre, originalProduct.descripcion, originalProduct.precio, originalProduct.stock_actual, originalProduct.imagen_url, usuario_id, razon_eliminacion]
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
                pel.imagen_url_original,
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
    const { fecha, dni_cliente, nombre_cliente, metodo_pago, total, productos, id_usuario_venta } = req.body;

    // AQUI ESTA LA CORRECCION:
    if (!fecha || !dni_cliente || !nombre_cliente || !metodo_pago || total === undefined || !productos || !Array.isArray(productos) || productos.length === 0 || !id_usuario_venta) {
        console.error('Error de validación: Faltan campos obligatorios o formato incorrecto para registrar venta.');
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios o el formato de los productos es incorrecto.' });
    }
    
    const parsedTotal = parseFloat(total);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({ success: false, message: 'El total de la venta debe ser un número válido y no negativo.' });
    }

    let connection;
    try {
        console.log('Iniciando obtención de conexión del pool para venta...');
        connection = await db.promise().getConnection();
        console.log('Conexión a la BD obtenida exitosamente para venta.');
        await connection.beginTransaction();
        console.log('Transacción de venta iniciada.');

        const [existingUserCheck] = await connection.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id_usuario_venta]);
        if (existingUserCheck.length === 0) {
            throw new Error(`Error: El usuario con ID ${id_usuario_venta} no se encuentra en la base de datos 'usuario'. Venta no registrada.`);
        }
        console.log('Usuario con ID', id_usuario_venta, 'encontrado. Continuando con la venta.');

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
            [id_usuario_venta, id_cliente, fecha, parsedTotal, metodo_pago]
        );
        const id_venta = ventaResult.insertId;
        console.log('Venta insertada con ID:', id_venta);

        for (const prod of productos) {
            if (!prod.id_prod || prod.cantidad === undefined || prod.precio_unidad === undefined || prod.subTotal === undefined) {
                throw new Error(`Datos incompletos para un producto en el detalle de venta.`);
            }
            const parsedCantidad = parseInt(prod.cantidad, 10);
            const parsedPrecioUnidad = parseFloat(prod.precio_unidad);
            const parsedSubTotal = parseFloat(prod.subTotal);

            if (isNaN(parsedCantidad) || parsedCantidad <= 0 || isNaN(parsedPrecioUnidad) || parsedPrecioUnidad < 0 || isNaN(parsedSubTotal) || parsedSubTotal < 0) {
                throw new Error(`Datos inválidos para la cantidad, precio o subtotal del producto ID ${prod.id_prod}.`);
            }

            const [productStock] = await connection.query('SELECT stock_actual FROM producto WHERE id_prod = ? AND estado = "activo"', [prod.id_prod]);
            if (productStock.length === 0 || productStock[0].stock_actual < parsedCantidad) {
                throw new Error(`Stock insuficiente o producto inactivo para el producto ID ${prod.id_prod} (${prod.nombre}).`);
            }

            await connection.query(
                'INSERT INTO detalle_venta (id_venta, id_prod, cantidad, precio_unidad, subTotal) VALUES (?, ?, ?, ?, ?)',
                [id_venta, prod.id_prod, parsedCantidad, parsedPrecioUnidad, parsedSubTotal]
            );
            console.log(`Detalle de venta insertado para producto ${prod.id_prod}.`);

            await connection.query(
                'UPDATE producto SET stock_actual = stock_actual - ? WHERE id_prod = ?',
                [parsedCantidad, prod.id_prod]
            );
            console.log(`Stock actualizado para producto ${prod.id_prod}.`);
        }

        await connection.commit();
        console.log('Transacción de venta confirmada con éxito.');
        res.status(201).json({ success: true, message: 'Venta registrada con éxito.', id_venta: id_venta });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            console.log('Transacción de venta revertida debido a un error.');
        }
        console.error('Error en la transacción de venta:', error.message || error);
        res.status(500).json({ success: false, message: error.message || 'Error interno del servidor al registrar la venta.' });
    } finally {
        if (connection) {
            connection.release();
            console.log('Conexión a la BD liberada.');
        }
    }
});

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

        const ventasConDetalle = await Promise.all(ventas.map(async (venta) => {
            const [productosVendidos] = await db.promise().query(`
                SELECT
                    dv.cantidad,
                    dv.precio_unidad,
                    dv.subTotal,
                    p.nombre AS nombre_producto,
                    p.imagen_url
                FROM
                    detalle_venta dv
                JOIN
                    producto p ON dv.id_prod = p.id_prod
                WHERE
                    dv.id_venta = ?
            `, [venta.id_venta]);
            return { ...venta, productos: productosVendidos };
        }));

        console.log('Historial de pedidos con detalles de productos obtenido de la BD:', ventasConDetalle.length, 'ventas.');
        res.json({ success: true, data: ventasConDetalle });
    } catch (error) {
        console.error('Error al obtener historial de pedidos con detalles y filtros:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener historial de pedidos.' });
    }
});

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
        const [totalVentasResult] = await db.promise().query(`SELECT COALESCE(SUM(v.total), 0) AS total ${baseQuery}`, params);
        const totalVentas = totalVentasResult[0].total;

        const [ventasEfectivoResult] = await db.promise().query(`SELECT COALESCE(SUM(v.total), 0) AS total ${baseQuery} AND v.metodo_pago = 'efectivo'`, params);
        const ventasEfectivo = ventasEfectivoResult[0].total;

        const [ventasTarjetaResult] = await db.promise().query(`SELECT COALESCE(SUM(v.total), 0) AS total ${baseQuery} AND v.metodo_pago = 'tarjeta'`, params);
        const ventasTarjeta = ventasTarjetaResult[0].total;

        const [ventasYapeResult] = await db.promise().query(`SELECT COALESCE(SUM(v.total), 0) AS total ${baseQuery} AND v.metodo_pago = 'yape'`, params);
        const ventasYape = ventasYapeResult[0].total;

        const [ventasPlinResult] = await db.promise().query(`SELECT COALESCE(SUM(v.total), 0) AS total ${baseQuery} AND v.metodo_pago = 'plin'`, params);
        const ventasPlin = ventasPlinResult[0].total;

        const [promedioVentasResult] = await db.promise().query(`SELECT COALESCE(AVG(v.total), 0) AS promedio ${baseQuery}`, params);
        const promedioVentas = promedioVentasResult[0].promedio;

        const [stockTotalResult] = await db.promise().query('SELECT COALESCE(SUM(stock_actual), 0) AS totalStock FROM producto WHERE estado = "activo"');
        const stockTotal = stockTotalResult[0].totalStock;

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const [ingresoDiarioResult] = await db.promise().query(
            `SELECT COALESCE(SUM(total), 0) AS dailyTotal FROM venta WHERE fecha BETWEEN ? AND ?`,
            [todayStart, todayEnd]
        );
        const ingresoDiario = ingresoDiarioResult[0].dailyTotal;

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const sevenDaysAgoStart = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0);

        const [ingresoSemanalResult] = await db.promise().query(
            `SELECT COALESCE(SUM(total), 0) AS weeklyTotal FROM venta WHERE fecha BETWEEN ? AND ?`,
            [sevenDaysAgoStart, todayEnd]
        );
        const ingresoSemanal = ingresoSemanalResult[0].weeklyTotal;

        const [ventasSemanaResult] = await db.promise().query(
            `SELECT COUNT(DISTINCT DATE(fecha)) AS diasConVentas, COALESCE(SUM(total), 0) AS totalVentasSemana
             FROM venta
             WHERE fecha BETWEEN ? AND ?`,
            [sevenDaysAgoStart, todayEnd]
        );

        let ventaPromedioSemanal = 0;
        if (ventasSemanaResult[0].diasConVentas > 0) {
            ventaPromedioSemanal = ventasSemanaResult[0].totalVentasSemana / ventasSemanaResult[0].diasConVentas;
        }

        const reportesData = {
            totalVentas: parseFloat(totalVentas),
            ventasEfectivo: parseFloat(ventasEfectivo),
            ventasTarjeta: parseFloat(ventasTarjeta),
            ventasYape: parseFloat(ventasYape),
            ventasPlin: parseFloat(ventasPlin),
            promedioVentas: parseFloat(promedioVentas),
            stockTotal: parseInt(stockTotal),
            ingresoDiario: parseFloat(ingresoDiario),
            ingresoSemanal: parseFloat(ingresoSemanal),
            ventaPromedioSemanal: parseFloat(ventaPromedioSemanal),
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
    console.log('Para detener el servidor, presiona Ctrl+C');
});