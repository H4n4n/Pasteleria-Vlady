import React, { useState, useEffect } from 'react';
import './VentaSection.css';

function VentaSection() {
    const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().slice(0, 10)); 
    const [dniCliente, setDniCliente] = useState('');
    const [nombreCliente, setNombreCliente] = useState('');
    const [metodoPago, setMetodoPago] = useState('');
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [cantidades, setCantidades] = useState({}); 
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const fetchProductos = async () => {
        setLoadingProducts(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3000/api/productos');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
            }
            const data = await response.json();
            if (data.success) {
                setProductosDisponibles(data.data);
                const initialQuantities = {};
                data.data.forEach(prod => {
                    initialQuantities[prod.id_prod] = 0;
                });
                setCantidades(initialQuantities);
            } else {
                setError(data.message || 'Error al cargar productos disponibles.');
            }
        } catch (err) {
            console.error("Error al obtener productos:", err);
            setError("No se pudieron cargar los productos del inventario. " + err.message);
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        fetchProductos();
    }, []);

    const handleCantidadChange = (productId, value) => {
        const product = productosDisponibles.find(p => p.id_prod === productId);
        const stockActual = product ? product.stock_actual : 0;
        let newQuantity = parseInt(value || '0');

        if (newQuantity < 0) newQuantity = 0;
        if (newQuantity > stockActual) {
            newQuantity = stockActual;
            setError(`No puedes seleccionar más de ${stockActual} unidades para ${product.nombre}.`);
        } else {
            setError(''); 
        }

        setCantidades(prevQuantities => ({
            ...prevQuantities,
            [productId]: newQuantity,
        }));
    };

    const calculateTotal = () => {
        let total = 0;
        productosDisponibles.forEach(prod => {
            const cantidad = cantidades[prod.id_prod] || 0;
            total += cantidad * prod.precio;
        });
        return total.toFixed(2);
    };

    const handleRegistrarPago = async () => {
        setMessage('');
        setError('');

        if (!fechaVenta || !dniCliente || !nombreCliente || !metodoPago) {
            setError('Por favor, completa todos los campos de información del cliente, fecha y método de pago.');
            return;
        }

        const productosVenta = productosDisponibles
            .filter(prod => cantidades[prod.id_prod] > 0) 
            .map(prod => {
                const cantidad = cantidades[prod.id_prod];
                return {
                    id_prod: prod.id_prod,
                    nombre: prod.nombre, 
                    cantidad: cantidad,
                    precio_unidad: prod.precio,
                    subTotal: parseFloat((cantidad * prod.precio).toFixed(2))
                };
            });

        if (productosVenta.length === 0) {
            setError('Debes seleccionar al menos un producto para la venta.');
            return;
        }

        for (const prod of productosVenta) {
            const originalProduct = productosDisponibles.find(p => p.id_prod === prod.id_prod);
            if (originalProduct && prod.cantidad > originalProduct.stock_actual) {
                setError(`Cantidad de ${prod.nombre} (${prod.cantidad}) excede el stock disponible (${originalProduct.stock_actual}). Ajusta la cantidad.`);
                return;
            }
        }

        const totalVenta = parseFloat(calculateTotal());
        if (totalVenta <= 0) {
            setError('El total de la venta debe ser mayor a S/. 0.');
            return;
        }

        const ventaData = {
            fecha: fechaVenta,
            dni_cliente: dniCliente,
            nombre_cliente: nombreCliente,
            metodo_pago: metodoPago,
            total: totalVenta,
            productos: productosVenta,
        };

        try {
            const response = await fetch('http://localhost:3000/api/registrar-venta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ventaData),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setMessage(data.message + ` ID Venta: ${data.id_venta}`);
                handleCancelar();
                fetchProductos(); 
            } else {
                setError(data.message || 'Error al registrar la venta.');
            }
        } catch (err) {
            console.error('Error al registrar la venta:', err);
            setError('Error de conexión con el servidor al registrar la venta. ' + err.message);
        }
    };

    const handleCancelar = () => {
        setFechaVenta(new Date().toISOString().slice(0, 10));
        setDniCliente('');
        setNombreCliente('');
        setMetodoPago('');
        const resetQuantities = {};
        productosDisponibles.forEach(prod => {
            resetQuantities[prod.id_prod] = 0;
        });
        setCantidades(resetQuantities);
        setMessage('');
        setError('');
    };

    if (loadingProducts) {
        return (
            <div className="page-content">
                <h2>Generar Nueva Venta</h2>
                <p>Cargando productos del inventario...</p>
            </div>
        );
    }

    if (error && !message) { 
        return (
            <div className="page-content error-message">
                <h2>Generar Nueva Venta</h2>
                <p>Error crítico: {error}. Por favor, verifica la conexión con el servidor y recarga la página.</p>
            </div>
        );
    }

    return (
        <div className="page-content generar-venta-section-specific">
            <h2>Generar Nueva Venta</h2>

            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            <div className="form-section">
                <h3>Datos del Cliente y Venta</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="fechaVenta">Fecha de Venta:</label>
                        <input
                            type="date"
                            id="fechaVenta"
                            value={fechaVenta}
                            onChange={(e) => setFechaVenta(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="dniCliente">DNI del Cliente:</label>
                        <input
                            type="text"
                            id="dniCliente"
                            placeholder="Número de DNI"
                            value={dniCliente}
                            onChange={(e) => setDniCliente(e.target.value)}
                            maxLength="8"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="nombreCliente">Nombre del Cliente:</label>
                        <input
                            type="text"
                            id="nombreCliente"
                            placeholder="Nombre completo"
                            value={nombreCliente}
                            onChange={(e) => setNombreCliente(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group full-width">
                        <label htmlFor="metodoPago">Método de Pago:</label>
                        <select
                            id="metodoPago"
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            required
                        >
                            <option value="">Seleccione...</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="yape">Yape</option>
                            <option value="plin">Plin</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="form-section products-selection-section">
                <h3>Selección de Productos</h3>
                <div className="products-list-grid">
                    {productosDisponibles.length > 0 ? (
                        productosDisponibles.map(producto => (
                            <div key={producto.id_prod} className="product-item">
                                <span className="product-name">{producto.nombre}</span>
                                <span className="product-price">S/.{parseFloat(producto.precio).toFixed(2)}</span>
                                <span className="product-stock">Stock: {producto.stock_actual}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={producto.stock_actual}
                                    value={cantidades[producto.id_prod] || 0}
                                    onChange={(e) => handleCantidadChange(producto.id_prod, e.target.value)}
                                    className="product-quantity-input"
                                    disabled={producto.stock_actual === 0}
                                />
                                {cantidades[producto.id_prod] > producto.stock_actual && (
                                    <p className="quantity-error-message">¡Stock insuficiente!</p>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="no-products-message">No hay productos disponibles para la venta.</p>
                    )}
                </div>
            </div>

            <div className="total-section full-width">
                <span>Total a Pagar:</span>
                <span className="total-amount">S/. {calculateTotal()}</span>
            </div>

            <div className="form-actions full-width">
                <button className="btn-primary" onClick={handleRegistrarPago}>Registrar Pago</button>
                <button className="btn-secondary" onClick={handleCancelar}>Cancelar</button>
            </div>
        </div>
    );
}

export default VentaSection;