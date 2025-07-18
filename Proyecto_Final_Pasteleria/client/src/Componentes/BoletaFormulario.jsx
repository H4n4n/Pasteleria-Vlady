import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const BoletaFormulario = () => {
    const [datosBoleta, setDatosBoleta] = useState({
        fecha: '',
        dni: '',
        nombre: '',
        metodoPago: '',
    });

    // Lista de productos (simulando lo que viene de la base de datos)
    const [productos, setProductos] = useState([
        { id_prod: 1, cantidad: 2, precio_unidad: 15.00, subTotal: 30.00 },
        { id_prod: 1, cantidad: 1, precio_unidad: 15.00, subTotal: 15.00 },
        { id_prod: 1, cantidad: 2, precio_unidad: 20.00, subTotal: 40.00 },
        { id_prod: 2, cantidad: 2, precio_unidad: 12.00, subTotal: 24.00 },
    ]);

    const boletaRef = useRef(null);

    const handleChange = (e) => {
        setDatosBoleta({
            ...datosBoleta,
            [e.target.name]: e.target.value,
        });
    };

    const generarBoletaPDF = async () => {
        if (!boletaRef.current) return;
        const canvas = await html2canvas(boletaRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        const { nombre, dni } = datosBoleta;
        pdf.save(`Boleta_${nombre}_${dni}.pdf`);
    };

    const totalGeneral = productos.reduce((acc, prod) => acc + prod.subTotal, 0);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h2>Formulario de Boleta</h2>
            <form>
                <label>Fecha:</label>
                <input type="date" name="fecha" value={datosBoleta.fecha} onChange={handleChange} />

                <label>DNI:</label>
                <input type="text" name="dni" value={datosBoleta.dni} onChange={handleChange} />

                <label>Nombre:</label>
                <input type="text" name="nombre" value={datosBoleta.nombre} onChange={handleChange} />

                <label>Método de Pago:</label>
                <select name="metodoPago" value={datosBoleta.metodoPago} onChange={handleChange}>
                    <option value="">Seleccione</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                </select>
            </form>

            <button onClick={generarBoletaPDF} style={{ marginTop: '15px' }}>Generar PDF</button>

            <div
                ref={boletaRef}
                style={{
                    padding: '20px',
                    border: '1px solid #ccc',
                    marginTop: '20px',
                    backgroundColor: '#fff',
                }}
            >
                <h2 style={{ textAlign: 'center' }}>Boleta de Venta</h2>
                <p><strong>Fecha:</strong> {datosBoleta.fecha}</p>
                <p><strong>DNI:</strong> {datosBoleta.dni}</p>
                <p><strong>Nombre:</strong> {datosBoleta.nombre}</p>
                <p><strong>Método de Pago:</strong> {datosBoleta.metodoPago}</p>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr>
                            <th style={cellStyle}>ID Producto</th>
                            <th style={cellStyle}>Cantidad</th>
                            <th style={cellStyle}>Precio Unidad</th>
                            <th style={cellStyle}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.map((prod, index) => (
                            <tr key={index}>
                                <td style={cellStyle}>{prod.id_prod}</td>
                                <td style={cellStyle}>{prod.cantidad}</td>
                                <td style={cellStyle}>S/ {prod.precio_unidad.toFixed(2)}</td>
                                <td style={cellStyle}>S/ {prod.subTotal.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h3 style={{ textAlign: 'right', marginTop: '20px' }}>
                    Total: S/ {totalGeneral.toFixed(2)}
                </h3>
            </div>
        </div>
    );
};

const cellStyle = {
    border: '1px solid #ccc',
    padding: '8px',
    textAlign: 'center',
};

export default BoletaFormulario;