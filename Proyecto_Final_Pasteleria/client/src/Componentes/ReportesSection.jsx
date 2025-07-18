import React, { useState, useEffect } from 'react';
import './ReportesVenta.css';
function ReportesVenta() {
    const [reportes, setReportes] = useState({
        totalVentas: 0,
        ventasEfectivo: 0,
        ventasTarjeta: 0
    });
    const [historialVentas, setHistorialVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReportes = async () => {
            try {
                const totalesResponse = await fetch('http://localhost:3000/api/reportes-totales');
                if (!totalesResponse.ok) {
                    throw new Error(`HTTP error! status: ${totalesResponse.status}`);
                }
                const totalesData = await totalesResponse.json();
                if (totalesData.success) {
                    setReportes(totalesData.data);
                } else {
                    setError(totalesData.message);
                }

                const historialResponse = await fetch('http://localhost:3000/api/historial-ventas');
                if (!historialResponse.ok) {
                    throw new Error(`HTTP error! status: ${historialResponse.status}`);
                }
                const historialData = await historialResponse.json();
                if (historialData.success) {
                    setHistorialVentas(historialData.data);
                } else {
                    setError(historialData.message);
                }

            } catch (err) {
                console.error("Error al cargar reportes:", err);
                setError("No se pudieron cargar los datos de reportes. Intenta de nuevo más tarde.");
            } finally {
                setLoading(false);
            }
        };

        fetchReportes();
    }, []);

    if (loading) {
        return <div className="reportes-container">Cargando reportes...</div>;
    }

    if (error) {
        return <div className="reportes-container error-message">Error: {error}</div>;
    }

    return (
        <div className="reportes-page-content">
            <h2>Reportes de Venta</h2>
            
            <div className="reportes-cards-container">
                <div className="report-card green">
                    <h3>Total Ventas</h3>
                    <p>S/ {reportes.totalVentas ? reportes.totalVentas.toFixed(2) : '0.00'}</p>
                </div>
                <div className="report-card blue">
                    <h3>Pagos en Efectivo</h3>
                    <p>S/ {reportes.ventasEfectivo ? reportes.ventasEfectivo.toFixed(2) : '0.00'}</p>
                </div>
                <div className="report-card yellow">
                    <h3>Pagos con Tarjeta</h3>
                    <p>S/ {reportes.ventasTarjeta ? reportes.ventasTarjeta.toFixed(2) : '0.00'}</p>
                </div>
            </div>

            <div className="historial-ventas-section">
                <h3>Historial de Ventas</h3>
                {historialVentas.length > 0 ? (
                    <table className="ventas-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Método de Pago</th>
                                <th>Total (S/)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historialVentas.map((venta, index) => (
                                <tr key={index}>
                                    <td>{new Date(venta.fecha).toLocaleDateString()}</td>
                                    <td>{venta.nombre_cliente}</td>
                                    <td>{venta.metodo_pago}</td>
                                    <td>S/ {venta.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No hay ventas registradas aún.</p>
                )}
            </div>
        </div>
    );
}

export default ReportesVenta;