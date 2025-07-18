import React, { useState, useEffect } from 'react';
import './HistorialVentasSection.css'; 

function HistorialVentasSection() {
    const [historialPedidos, setHistorialPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistorialPedidos = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/historial-pedidos');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success) {
                    setHistorialPedidos(data.data);
                } else {
                    setError(data.message || 'No se pudo obtener el historial de pedidos.');
                }
            } catch (err) {
                console.error('Error al cargar el historial de pedidos:', err);
                setError('Error de conexión con el servidor. Intenta de nuevo más tarde.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistorialPedidos();
    }, []);

    if (loading) {
        return (
            <div className="page-content historial-pedidos-section">
                <h2>Historial de Pedidos</h2>
                <p>Cargando historial de pedidos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-content historial-pedidos-section error-message">
                <h2>Historial de Pedidos</h2>
                <p>Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="page-content historial-pedidos-section">
            <h2>Historial de Pedidos</h2>
            {historialPedidos.length > 0 ? (
                <div className="table-container">
                    <table className="pedidos-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>DNI Cliente</th>
                                <th>Nombre Cliente</th>
                                <th>Método de Pago</th>
                                <th>Total (S/)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historialPedidos.map((pedido, index) => (
                                <tr key={index}>
                                    <td>{new Date(pedido.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                    <td>{pedido.dni_cliente}</td>
                                    <td>{pedido.nombre_cliente}</td>
                                    <td>{pedido.metodo_pago}</td>
                                    <td>S/ {parseFloat(pedido.total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="no-data-message">No hay pedidos registrados aún. ¡Genera tu primera venta!</p>
            )}
        </div>
    );
}

export default HistorialVentasSection;