import React, { useState, useEffect } from 'react';
import './VentaSection.css'; 

function VentaSection() {
    const [fechaVenta, setFechaVenta] = useState('');
    const [dniCliente, setDniCliente] = useState('');
    const [nombreCliente, setNombreCliente] = useState('');
    const [metodoPago, setMetodoPago] = useState('');
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [cantidades, setCantidades] = useState({});
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [errorProducts, setErrorProducts] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/productos');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
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
                    setErrorProducts(data.message);
                }
            } catch (error) {
                console.error("Error al obtener productos:", error);
                setErrorProducts("No se pudieron cargar los productos del inventario.");
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProductos();
    }, []);

    const handleCantidadChange = (productId, value) => {
        setCantidades(prevQuantities => ({
            ...prevQuantities,
            [productId]: Math.max(0, parseInt(value || '0')),
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

        if (!fechaVenta || !dniCliente || !nombreCliente || !metodoPago || Object.values(cantidades).every(qty => qty === 0)) {
            setMessage('Por favor, completa todos los campos de información del cliente, fecha, método de pago y selecciona al menos un producto.');
            return;
        }

        const productosVenta = productosDisponibles
            .filter(prod => cantidades[prod.id_prod] > 0)
            .map(prod => ({
                id_prod: prod.id_prod,
                cantidad: cantidades[prod.id_prod],
                precio_unidad: prod.precio,
                subTotal: (cantidades[prod.id_prod] * prod.precio).toFixed(2)
            }));

        const totalVenta = parseFloat(calculateTotal());

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
            } else {
                setMessage(data.message || 'Error al registrar la venta.');
            }
        } catch (error) {
            console.error('Error al registrar la venta:', error);
            setMessage('Error de conexión con el servidor al registrar la venta.');
        }
    };

    const handleCancelar = () => {
        setFechaVenta('');
        setDniCliente('');
        setNombreCliente('');
        setMetodoPago('');
        const resetQuantities = {};
        productosDisponibles.forEach(prod => {
            resetQuantities[prod.id_prod] = 0;
        });
        setCantidades(resetQuantities);
        setMessage('');
    };

    if (loadingProducts) {
        return (
            <div className="page-content"> 
                <h2>Generar Nueva Venta</h2>
                <p>Cargando productos...</p>
            </div>
        );
    }

    if (errorProducts) {
        return (
            <div className="page-content error-message">
                <h2>Generar Nueva Venta</h2>
                <p>Error: {errorProducts}</p>
            </div>
        );
    }

    return (
        <div className="page-content generar-venta-section-specific">
            <h2>Generar Nueva Venta</h2>

            {message && <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}

            <div className="form-section">
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="fechaVenta">Fecha de Venta:</label>
                        <input
                            type="date"
                            id="fechaVenta"
                            value={fechaVenta}
                            onChange={(e) => setFechaVenta(e.target.value)}
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
                        />
                    </div>
                    <div className="form-group full-width">
                        <label htmlFor="metodoPago">Método de Pago:</label>
                        <select
                            id="metodoPago"
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                        >
                            <option value="">Seleccione...</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="yape">Yape</option>
                            <option value="plin">Plin</option>
                        </select>
                    </div>
                </div>

                <div className="products-selection-section">
                    <h3>Selección de Productos</h3>
                    <div className="products-list-grid">
                        {productosDisponibles.map(producto => (
                            <div key={producto.id_prod} className="product-item">
                                <span>{producto.nombre} (S/.{producto.precio.toFixed(2)})</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={cantidades[producto.id_prod] || 0}
                                    onChange={(e) => handleCantidadChange(producto.id_prod, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="total-section full-width">
                    <span>Total: S/.</span>
                    <span className="total-amount">{calculateTotal()}</span>
                </div>

                <div className="form-actions full-width">
                    <button className="btn-primary" onClick={handleRegistrarPago}>Registrar Pago</button>
                    <button className="btn-secondary" onClick={handleCancelar}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}

export default VentaSection;