import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

    const boletaRef = useRef(); // Referencia a la boleta para capturar

    const fetchProductos = async () => {
        setLoadingProducts(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3000/api/productos');
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
            setError("No se pudieron cargar los productos. " + err.message);
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

        setCantidades(prev => ({
            ...prev,
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

    const generarBoletaPDF = async () => {
        if (!boletaRef.current) return;
        const canvas = await html2canvas(boletaRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Boleta_${nombreCliente}_${dniCliente}.pdf`);
    };

    const handleRegistrarPago = async () => {
        setMessage('');
        setError('');

        if (!fechaVenta || !dniCliente || !nombreCliente || !metodoPago) {
            setError('Completa todos los campos obligatorios.');
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
            setError('Selecciona al menos un producto.');
            return;
        }

        const totalVenta = parseFloat(calculateTotal());
        if (totalVenta <= 0) {
            setError('El total debe ser mayor a S/. 0');
            return;
        }

        const ventaData = {
            fecha: fechaVenta,
            dni_cliente: dniCliente,
            nombre_cliente: nombreCliente,
            metodo_pago: metodoPago,
            total: totalVenta,
            productos: productosVenta,
            id_usuario_venta: 1,
        };

        try {
            const response = await fetch('http://localhost:3000/api/registrar-venta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ventaData),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setMessage(data.message + ` ID Venta: ${data.id_venta}`);
                await generarBoletaPDF(); // <- Generar PDF al registrar
                handleCancelar();
                fetchProductos();
            } else {
                setError(data.message || 'Error al registrar la venta.');
            }
        } catch (err) {
            setError('Error de conexión con el servidor. ' + err.message);
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
        return <div className="page-content"><h2>Generar Nueva Venta</h2><p>Cargando productos...</p></div>;
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
                        <label>Fecha de Venta:</label>
                        <input type="date" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>DNI:</label>
                        <input type="text" maxLength="8" value={dniCliente} onChange={(e) => setDniCliente(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Nombre:</label>
                        <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                    </div>
                    <div className="form-group full-width">
                        <label>Método de Pago:</label>
                        <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                            <option value="">Seleccione...</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="yape">Yape</option>
                            <option value="plin">Plin</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h3>Productos</h3>
                <div className="products-list-grid">
                    {productosDisponibles.map(producto => (
                        <div key={producto.id_prod} className="product-item">
                            <span>{producto.nombre}</span>
                            <span>S/.{parseFloat(producto.precio).toFixed(2)}</span>
                            <span>Stock: {producto.stock_actual}</span>
                            <input
                                type="number"
                                min="0"
                                max={producto.stock_actual}
                                value={cantidades[producto.id_prod] || 0}
                                onChange={(e) => handleCantidadChange(producto.id_prod, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="total-section">
                <strong>Total a Pagar: S/. {calculateTotal()}</strong>
            </div>

            <div className="form-actions">
                <button className="btn-primary" onClick={handleRegistrarPago}>Registrar Pago</button>
                <button className="btn-secondary" onClick={handleCancelar}>Cancelar</button>
            </div>

            {/* Boleta para PDF */}
            <div ref={boletaRef} style={{ padding: '20px', backgroundColor: '#fff', marginTop: '40px', border: '1px solid #ccc' }}>
                <h3>Boleta de Venta</h3>
                <p><strong>Fecha:</strong> {fechaVenta}</p>
                <p><strong>Cliente:</strong> {nombreCliente}</p>
                <p><strong>DNI:</strong> {dniCliente}</p>
                <p><strong>Método de Pago:</strong> {metodoPago}</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Producto</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Cantidad</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>P. Unitario</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productosDisponibles.filter(p => cantidades[p.id_prod] > 0).map(prod => (
                            <tr key={prod.id_prod}>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{prod.nombre}</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{cantidades[prod.id_prod]}</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>S/. {prod.precio}</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                                    S/. {(cantidades[prod.id_prod] * prod.precio).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <strong>Total: S/. {calculateTotal()}</strong>
                </div>
            </div>
        </div>
    );
}

export default VentaSection;