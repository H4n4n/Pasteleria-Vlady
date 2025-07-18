// ReportesVenta.jsx (MODIFICADO)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { jsPDF } from 'jspdf';
import './ReportesVenta.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ReportesVenta() {
    const [reportes, setReportes] = useState({
        totalVentas: 0,
        ventasEfectivo: 0,
        ventasTarjeta: 0,
        ventasYape: 0,
        ventasPlin: 0,
        promedioVentas: 0,
        // Nuevos indicadores
        ingresoDiario: 0, // Ingreso del día actual
        ingresoSemanal: 0, // Ingreso de los últimos 7 días
        ventaPromedioSemanal: 0, // Promedio diario de ventas en la última semana
        stockTotal: 0, // Stock total de todos los productos activos
    });
    const [historialVentas, setHistorialVentas] = useState([]);
    const [productosEliminados, setProductosEliminados] = useState([]);
    const [mostrarEliminados, setMostrarEliminados] = useState(false);
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [{
            label: 'Total de Ventas (S/)',
            data: [],
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
        }],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filterFechaInicio, setFilterFechaInicio] = useState('');
    const [filterFechaFin, setFilterFechaFin] = useState('');
    const [filterDniCliente, setFilterDniCliente] = useState('');

    const processChartData = useCallback((ventas) => {
        const salesByDate = {};
        ventas.forEach(venta => {
            const date = new Date(venta.fecha).toISOString().split('T')[0];
            salesByDate[date] = (salesByDate[date] || 0) + parseFloat(venta.total);
        });
        const sortedDates = Object.keys(salesByDate).sort();
        const labels = sortedDates;
        const data = sortedDates.map(date => salesByDate[date]);
        setChartData({
            labels: labels,
            datasets: [{
                label: 'Total de Ventas por Día (S/)',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            }],
        });
    }, []);

    const fetchReportes = useCallback(async () => {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams();
        if (filterFechaInicio) {
            queryParams.append('fechaInicio', filterFechaInicio);
        }
        if (filterFechaFin) {
            queryParams.append('fechaFin', filterFechaFin);
        }
        if (filterDniCliente) {
            queryParams.append('dniCliente', filterDniCliente);
        }

        const queryString = queryParams.toString();
        const urlSuffix = queryString ? `?${queryString}` : '';

        try {
            const totalesResponse = await fetch(`http://localhost:3000/api/reportes-totales${urlSuffix}`);
            if (!totalesResponse.ok) {
                const errorText = await totalesResponse.text();
                throw new Error(`HTTP error! status: ${totalesResponse.status}. Detalles: ${errorText.substring(0, 150)}...`);
            }
            const totalesData = await totalesResponse.json();
            if (totalesData.success) {
                setReportes({
                    totalVentas: totalesData.data.totalVentas || 0,
                    ventasEfectivo: totalesData.data.ventasEfectivo || 0,
                    ventasTarjeta: totalesData.data.ventasTarjeta || 0,
                    ventasYape: totalesData.data.ventasYape || 0,
                    ventasPlin: totalesData.data.ventasPlin || 0,
                    promedioVentas: totalesData.data.promedioVentas || 0,
                    // Actualizar con nuevos indicadores
                    ingresoDiario: totalesData.data.ingresoDiario || 0,
                    ingresoSemanal: totalesData.data.ingresoSemanal || 0,
                    ventaPromedioSemanal: totalesData.data.ventaPromedioSemanal || 0,
                    stockTotal: totalesData.data.stockTotal || 0,
                });
            } else {
                setError(totalesData.message);
            }

            const historialResponse = await fetch(`http://localhost:3000/api/historial-pedidos${urlSuffix}`);
            if (!historialResponse.ok) {
                const errorText = await historialResponse.text();
                throw new Error(`HTTP error! status: ${historialResponse.status}. Detalles: ${errorText.substring(0, 150)}...`);
            }
            const historialData = await historialResponse.json();
            if (historialData.success) {
                setHistorialVentas(historialData.data);
                processChartData(historialData.data);
            } else {
                setError(historialData.message);
            }

        } catch (err) {
            console.error("Error al cargar reportes:", err);
            if (err instanceof SyntaxError) {
                setError('Error al procesar la respuesta del servidor (JSON inválido). Revisa el servidor.');
            } else {
                setError(`No se pudieron cargar los datos de reportes. ${err.message || 'Intenta de nuevo más tarde.'}`);
            }
        } finally {
            setLoading(false);
        }
    }, [filterFechaInicio, filterFechaFin, filterDniCliente, processChartData]);

    const fetchProductosEliminados = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:3000/api/productos-eliminados');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}. Detalles: ${errorText.substring(0, 150)}...`);
            }
            const data = await response.json();
            if (data.success) {
                setProductosEliminados(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error("Error al cargar productos eliminados:", err);
            setError(`No se pudieron cargar los productos eliminados. ${err.message || 'Intenta de nuevo más tarde.'}`);
        }
    }, []);

    useEffect(() => {
        fetchReportes();
        const intervalId = setInterval(fetchReportes, 30000);
        return () => clearInterval(intervalId);
    }, [fetchReportes]);

    useEffect(() => {
        if (mostrarEliminados && productosEliminados.length === 0) {
            fetchProductosEliminados();
        }
    }, [mostrarEliminados, productosEliminados.length, fetchProductosEliminados]);

    const generateReceiptPDF = useCallback((ventaData) => {
        const doc = new jsPDF();

        const margin = 15;
        let y = margin;
        const lineHeight = 7;
        const titleFontSize = 18;
        const headerFontSize = 12;
        const textFontSize = 10;
        const footerFontSize = 9;

        doc.setFontSize(titleFontSize);
        doc.text("BOLETA DE VENTA", doc.internal.pageSize.width / 2, y, { align: "center" });
        y += lineHeight * 2;

        doc.setFontSize(headerFontSize);
        doc.text("Pastelería Vlady", margin, y);
        y += lineHeight;
        doc.text("Dirección: Tu Calle 123", margin, y);
        y += lineHeight;
        doc.text("RUC: 20XXXXXXXXX", margin, y);
        y += lineHeight * 2;

        doc.setFontSize(textFontSize);
        doc.text(`Fecha: ${new Date(ventaData.fecha).toLocaleDateString()} ${new Date(ventaData.fecha).toLocaleTimeString()}`, margin, y);
        y += lineHeight;
        doc.text(`Vendedor: ${ventaData.nombre_usuario_venta || 'N/A'}`, margin, y);
        y += lineHeight * 2;

        doc.text(`Cliente: ${ventaData.nombre_cliente || 'Consumidor Final'}`, margin, y);
        y += lineHeight;
        doc.text(`DNI: ${ventaData.dni_cliente || 'N/A'}`, margin, y);
        y += lineHeight;
        doc.text(`Método de Pago: ${ventaData.metodo_pago.toUpperCase()}`, margin, y);
        y += lineHeight * 2;

        // Tabla de productos
        doc.setFontSize(headerFontSize);
        doc.text("Productos:", margin, y);
        y += lineHeight;

        const tableHeaders = ["Producto", "Cant.", "Precio U.", "SubTotal"];
        const colWidths = [80, 20, 30, 30];
        const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

        doc.text(tableHeaders[0], colX[0], y);
        doc.text(tableHeaders[1], colX[1], y);
        doc.text(tableHeaders[2], colX[2], y);
        doc.text(tableHeaders[3], colX[3], y);
        y += lineHeight;
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);
        y += lineHeight;

        doc.setFontSize(textFontSize);
        if (ventaData.productos && ventaData.productos.length > 0) {
            ventaData.productos.forEach(prod => {
                if (y + lineHeight > doc.internal.pageSize.height - margin) {
                    doc.addPage();
                    y = margin;
                    doc.setFontSize(textFontSize);
                }
                doc.text(prod.nombre_producto, colX[0], y);
                doc.text(String(prod.cantidad), colX[1], y);
                doc.text(`S/ ${parseFloat(prod.precio_unidad).toFixed(2)}`, colX[2], y);
                doc.text(`S/ ${parseFloat(prod.subTotal).toFixed(2)}`, colX[3], y);
                y += lineHeight;
            });
        } else {
            doc.text("No hay detalles de productos disponibles.", margin, y);
            y += lineHeight;
        }

        y += lineHeight;
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);
        y += lineHeight;

        // Total
        doc.setFontSize(headerFontSize);
        doc.text(`TOTAL: S/ ${parseFloat(ventaData.total).toFixed(2)}`, doc.internal.pageSize.width - margin, y, { align: "right" });
        y += lineHeight * 2;

        // Mensaje de agradecimiento
        doc.setFontSize(footerFontSize);
        doc.text("¡Gracias por su compra!", doc.internal.pageSize.width / 2, y, { align: "center" });
        y += lineHeight;
        doc.text("Válido como comprobante de compra.", doc.internal.pageSize.width / 2, y, { align: "center" });

        doc.save(`boleta_venta_${ventaData.id_venta}.pdf`);
    }, []);


    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Ventas Totales por Fecha',
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Fecha',
                },
                ticks: {
                    autoSkip: true,
                    maxRotation: 45,
                    minRotation: 0,
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Total de Ventas (S/)',
                },
                beginAtZero: true,
            },
        },
    };

    const handleClearFilters = () => {
        setFilterFechaInicio('');
        setFilterFechaFin('');
        setFilterDniCliente('');
    };

    if (loading) {
        return <div className="reportes-container">Cargando reportes...</div>;
    }

    if (error) {
        return <div className="reportes-container error-message">Error: {error}</div>;
    }

    return (
        <div className="reportes-page-content">
            <h2>Reportes de Venta</h2>

            <div className="filters-section">
                <h3>Filtros de Búsqueda</h3>
                <div className="filter-group">
                    <label htmlFor="fechaInicio">Fecha Inicio:</label>
                    <input
                        type="date"
                        id="fechaInicio"
                        value={filterFechaInicio}
                        onChange={(e) => setFilterFechaInicio(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="fechaFin">Fecha Fin:</label>
                    <input
                        type="date"
                        id="fechaFin"
                        value={filterFechaFin}
                        onChange={(e) => setFilterFechaFin(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="dniCliente">DNI Cliente:</label>
                    <input
                        type="text"
                        id="dniCliente"
                        value={filterDniCliente}
                        onChange={(e) => setFilterDniCliente(e.target.value)}
                        placeholder="DNI del cliente"
                        maxLength="8"
                    />
                </div>
                <div className="filter-buttons">
                    <button onClick={fetchReportes} className="apply-filter-button">Aplicar Filtros</button>
                    <button onClick={handleClearFilters} className="clear-filter-button">Limpiar Filtros</button>
                </div>
            </div>

            <div className="reportes-cards-container">
                <div className="report-card green">
                    <h3>Total Ventas</h3>
                    <p>S/ {reportes.totalVentas ? parseFloat(reportes.totalVentas).toFixed(2) : '0.00'}</p>
                </div>
                <div className="report-card blue">
                    <h3>Pagos en Efectivo</h3>
                    <p>S/ {reportes.ventasEfectivo ? parseFloat(reportes.ventasEfectivo).toFixed(2) : '0.00'}</p>
                </div>
                <div className="report-card yellow">
                    <h3>Pagos con Tarjeta</h3>
                    <p>S/ {reportes.ventasTarjeta ? parseFloat(reportes.ventasTarjeta).toFixed(2) : '0.00'}</p>
                </div>
                <div className="report-card purple">
                    <h3>Pagos con Yape</h3>
                    <p>S/ {reportes.ventasYape ? parseFloat(reportes.ventasYape).toFixed(2) : '0.00'}</p>
                </div>
                <div className="report-card orange">
                    <h3>Pagos con Plin</h3>
                    <p>S/ {reportes.ventasPlin ? parseFloat(reportes.ventasPlin).toFixed(2) : '0.00'}</p>
                </div>
                <div className="report-card gray">
                    <h3>Promedio de Ventas (Filtradas)</h3>
                    <p>S/ {reportes.promedioVentas ? parseFloat(reportes.promedioVentas).toFixed(2) : '0.00'}</p>
                </div>
            </div>

            {/* Sección de Indicadores Adicionales */}
            <div className="additional-indicators-section">
                <h3>Indicadores Adicionales</h3>
                <div className="reportes-cards-container">
                    <div className="report-card light-green">
                        <h3>Ingreso Diario</h3>
                        <p>S/ {reportes.ingresoDiario ? parseFloat(reportes.ingresoDiario).toFixed(2) : '0.00'}</p>
                    </div>
                    <div className="report-card light-blue">
                        <h3>Ingreso Semanal</h3>
                        <p>S/ {reportes.ingresoSemanal ? parseFloat(reportes.ingresoSemanal).toFixed(2) : '0.00'}</p>
                    </div>
                    <div className="report-card light-purple">
                        <h3>Venta Promedio Semanal</h3>
                        <p>S/ {reportes.ventaPromedioSemanal ? parseFloat(reportes.ventaPromedioSemanal).toFixed(2) : '0.00'}</p>
                    </div>
                    <div className="report-card light-gray">
                        <h3>Stock Total Productos</h3>
                        <p>{reportes.stockTotal} unidades</p>
                    </div>
                    {/* Si tuvieras un indicador de Tiempo de Atención Promedio, iría aquí */}
                    {/* <div className="report-card light-orange">
                        <h3>Tiempo Atención Promedio</h3>
                        <p>00:00:00</p>
                    </div> */}
                </div>
            </div>


            <div className="chart-section">
                <h3>Ventas Diarias</h3>
                {historialVentas.length > 0 ? (
                    <div className="chart-container">
                        <Bar options={chartOptions} data={chartData} />
                    </div>
                ) : (
                    <p>No hay datos de ventas para mostrar en el gráfico con los filtros aplicados.</p>
                )}
            </div>

            <div className="historial-ventas-section">
                <h3>Historial de Ventas</h3>
                {historialVentas.length > 0 ? (
                    <table className="ventas-table">
                        <thead>
                            <tr>
                                <th>ID Venta</th>
                                <th>Fecha</th>
                                <th>Cliente (DNI)</th>
                                <th>Nombre Cliente</th>
                                <th>Método de Pago</th>
                                <th>Total (S/)</th>
                                <th>Usuario que vendió</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historialVentas.map((venta) => (
                                <tr key={venta.id_venta}>
                                    <td>{venta.id_venta}</td>
                                    <td>{new Date(venta.fecha).toLocaleDateString()}</td>
                                    <td>{venta.dni_cliente}</td>
                                    <td>{venta.nombre_cliente}</td>
                                    <td>{venta.metodo_pago}</td>
                                    <td>S/ {parseFloat(venta.total).toFixed(2)}</td>
                                    <td>{venta.nombre_usuario_venta}</td>
                                    <td>
                                        <button
                                            onClick={() => generateReceiptPDF(venta)}
                                            className="view-receipt-button"
                                            title="Ver Boleta"
                                        >
                                            📄
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No hay ventas registradas con los filtros aplicados.</p>
                )}
            </div>

            <div className="deleted-records-section">
                <button
                    className="toggle-deleted-button"
                    onClick={() => setMostrarEliminados(!mostrarEliminados)}
                >
                    {mostrarEliminados ? 'Ocultar Productos Eliminados' : 'Mostrar Productos Eliminados'}
                </button>

                {mostrarEliminados && (
                    <>
                        <h3>Historial de Productos Eliminados (Lógicamente)</h3>
                        {productosEliminados.length > 0 ? (
                            <table className="ventas-table">
                                <thead>
                                    <tr>
                                        <th>ID Log</th>
                                        <th>ID Prod. Original</th>
                                        <th>Nombre Producto</th>
                                        <th>Precio Original</th>
                                        <th>Stock Original</th>
                                        <th>Eliminado Por</th>
                                        <th>Fecha Eliminación</th>
                                        <th>Razón</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productosEliminados.map((prod) => (
                                        <tr key={prod.id_log}>
                                            <td>{prod.id_log}</td>
                                            <td>{prod.id_prod_original}</td>
                                            <td>{prod.nombre_producto}</td>
                                            <td>S/ {parseFloat(prod.precio_original).toFixed(2)}</td>
                                            <td>{prod.stock_actual_original}</td>
                                            <td>{prod.nombre_usuario_elimino}</td>
                                            <td>{new Date(prod.fecha_eliminacion).toLocaleString()}</td>
                                            <td>{prod.razon_eliminacion}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No hay productos eliminados registrados.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ReportesVenta;