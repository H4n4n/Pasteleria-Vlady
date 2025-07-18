import React, { useState, useEffect, useCallback } from 'react'; // Agregado useCallback
import './HistorialVentasSection.css'; 

function HistorialVentasSection() {
    const [historialPedidos, setHistorialPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Nuevos estados para los filtros
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [dniCliente, setDniCliente] = useState('');

    // Función para formatear la fecha a 'YYYY-MM-DD'
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [day, month, year] = dateString.split('/');
        if (!day || !month || !year) return ''; // Manejar formato inválido
        return `${year}-${month}-${day}`;
    };

    // Modificamos fetchHistorialPedidos para que acepte filtros
    const fetchHistorialPedidos = useCallback(async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            // Construir la URL con parámetros de consulta para los filtros
            const params = new URLSearchParams();
            if (filters.fechaInicio) params.append('fechaInicio', formatDate(filters.fechaInicio));
            if (filters.fechaFin) params.append('fechaFin', formatDate(filters.fechaFin));
            if (filters.dniCliente) params.append('dniCliente', filters.dniCliente);

            const url = `http://localhost:3000/api/historial-pedidos?${params.toString()}`;
            console.log("Fetching URL:", url); // Para depuración

            const response = await fetch(url);
            if (!response.ok) {
                const errorBody = await response.text(); // Leer el cuerpo de la respuesta para más detalles
                throw new Error(`HTTP error! status: ${response.status}. Detalles: ${errorBody.substring(0, 200)}...`);
            }
            const data = await response.json();
            if (data.success) {
                setHistorialPedidos(data.data);
            } else {
                setError(data.message || 'No se pudo obtener el historial de pedidos.');
            }
        } catch (err) {
            console.error('Error al cargar el historial de pedidos:', err);
            if (err.message.includes('Unexpected token') || err.message.includes('JSON inválido')) {
                setError('Error al procesar la respuesta del servidor. Es posible que el servidor no haya respondido con JSON o haya habido un error interno. Revisa la consola del servidor.');
            } else {
                setError('Error de conexión con el servidor. Intenta de nuevo más tarde.');
            }
        } finally {
            setLoading(false);
        }
    }, []); // Dependencia vacía para useCallback, ya que fetchHistorialPedidos recibe los filtros como argumento

    // Efecto para cargar los pedidos iniciales (sin filtros)
    useEffect(() => {
        fetchHistorialPedidos({}); // Carga inicial sin filtros
    }, [fetchHistorialPedidos]);

    // Manejadores de cambio para los inputs de filtro
    const handleFechaInicioChange = (e) => setFechaInicio(e.target.value);
    const handleFechaFinChange = (e) => setFechaFin(e.target.value);
    const handleDniClienteChange = (e) => setDniCliente(e.target.value);

    // Manejador para aplicar filtros
    const handleAplicarFiltros = (e) => {
        e.preventDefault(); // Evitar recarga de página del formulario
        fetchHistorialPedidos({ fechaInicio, fechaFin, dniCliente });
    };

    // Manejador para limpiar filtros
    const handleLimpiarFiltros = () => {
        setFechaInicio('');
        setFechaFin('');
        setDniCliente('');
        fetchHistorialPedidos({}); // Vuelve a cargar sin filtros
    };

    // Renderizado condicional para carga y error (se movió dentro del return para que los filtros también se muestren)
    return (
        <div className="page-content historial-pedidos-section">
            <h2>Historial de Pedidos</h2>

            {/* Sección de Filtros de Búsqueda */}
            <div className="filtros-busqueda-container">
                <h3>Filtros de Búsqueda</h3>
                <form onSubmit={handleAplicarFiltros} className="filtros-form">
                    <div className="form-group-filter">
                        <label htmlFor="fechaInicio">Fecha Inicio:</label>
                        <input
                            type="text" // Usamos text para permitir el formato dd/mm/aaaa
                            id="fechaInicio"
                            value={fechaInicio}
                            onChange={handleFechaInicioChange}
                            placeholder="dd/mm/aaaa"
                            pattern="\d{2}/\d{2}/\d{4}" // Patrón para forzar el formato
                            title="Formato: dd/mm/aaaa"
                        />
                        {/* Puedes añadir un icono de calendario aquí si tienes una librería de iconos */}
                    </div>
                    <div className="form-group-filter">
                        <label htmlFor="fechaFin">Fecha Fin:</label>
                        <input
                            type="text" // Usamos text para permitir el formato dd/mm/aaaa
                            id="fechaFin"
                            value={fechaFin}
                            onChange={handleFechaFinChange}
                            placeholder="dd/mm/aaaa"
                            pattern="\d{2}/\d{2}/\d{4}"
                            title="Formato: dd/mm/aaaa"
                        />
                        {/* Puedes añadir un icono de calendario aquí */}
                    </div>
                    <div className="form-group-filter">
                        <label htmlFor="dniCliente">DNI Cliente:</label>
                        <input
                            type="text"
                            id="dniCliente"
                            value={dniCliente}
                            onChange={handleDniClienteChange}
                            placeholder="DNI del cliente"
                        />
                    </div>
                    <div className="filter-buttons">
                        <button type="submit" className="btn-aplicar">Aplicar Filtros</button>
                        <button type="button" onClick={handleLimpiarFiltros} className="btn-limpiar">Limpiar Filtros</button>
                    </div>
                </form>
            </div>

            {loading ? (
                <p>Cargando historial de pedidos...</p>
            ) : error ? (
                <p className="error-message">Error: {error}</p>
            ) : historialPedidos.length > 0 ? (
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
                                <tr key={pedido.id_venta || index}> {/* Usar id_venta si está disponible, sino index */}
                                    <td>{new Date(pedido.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                    <td>{pedido.dni_cliente}</td>
                                    <td>{pedido.nombre_cliente}</td>
                                    <td>{pedido.metodo_pago}</td>
                                    <td>S/ {parseFloat(pedido.total).toFixed(2)}</td> {/* Solución para toFixed */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="no-data-message">No hay pedidos registrados con los filtros aplicados o aún no hay pedidos. ¡Genera tu primera venta!</p>
            )}
        </div>
    );
}

export default HistorialVentasSection;