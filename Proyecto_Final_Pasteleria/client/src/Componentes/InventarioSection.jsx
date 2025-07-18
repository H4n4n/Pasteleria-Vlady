import React, { useState, useEffect, useCallback } from 'react';
import './InventarioSection.css'; 

function ControlInventario() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nuevoProducto, setNuevoProducto] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        stock: '',
        imagen_url: '',
    });
    const [editandoProducto, setEditandoProducto] = useState(null);

    const fetchProductos = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/api/productos');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}. Detalles: ${errorText.substring(0, 150)}...`);
            }
            const data = await response.json();
            if (data.success) {
                setProductos(data.data);
                setError(null);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error al cargar productos:', err);
            if (err instanceof SyntaxError) {
                setError('Error al procesar la respuesta del servidor (JSON inválido). Revisa el servidor.');
            } else {
                setError(`No se pudieron cargar los productos: ${err.message || 'Error de conexión con el servidor.'}`);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProductos();
    }, [fetchProductos]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (editandoProducto) {
            setEditandoProducto({ ...editandoProducto, [name]: value });
        } else {
            setNuevoProducto({ ...nuevoProducto, [name]: value });
        }
    };

    const handleAddUpdateProduct = async (e) => {
        e.preventDefault();
        const productData = editandoProducto || nuevoProducto;
        const url = editandoProducto
            ? `http://localhost:3000/api/productos/${editandoProducto.id_prod}`
            : 'http://localhost:3000/api/productos';
        const method = editandoProducto ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al procesar el producto.');
            }

            alert(editandoProducto ? 'Producto actualizado exitosamente!' : 'Producto añadido exitosamente!');
            setNuevoProducto({ nombre: '', descripcion: '', precio: '', stock: '', imagen_url: '' });
            setEditandoProducto(null); 
            fetchProductos();
        } catch (err) {
            console.error('Error al añadir/actualizar producto:', err);
            alert(`Error al ${editandoProducto ? 'actualizar' : 'añadir'} el producto: ${err.message}`);
        }
    };

    const handleEditClick = (product) => {
        setEditandoProducto({
            id_prod: product.id_prod,
            nombre: product.nombre,
            descripcion: product.descripcion,
            precio: product.precio,
            stock: product.stock_actual,
            imagen_url: product.imagen_url || '',
        });
    };

    const getImageUrl = (filename) => {
        return filename ? `/images/${filename}` : '/placeholder.png';
    };

    if (loading) {
        return <div className="inventario-container">Cargando productos...</div>;
    }

    if (error) {
        return <div className="inventario-container error-message">Error: {error}</div>;
    }

    return (
        <div className="inventario-page-content">
            <h2>Control de Inventario</h2>

            <form onSubmit={handleAddUpdateProduct} className="product-form">
                <h3>{editandoProducto ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
                <div className="form-group">
                    <label htmlFor="nombre">Nombre:</label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={editandoProducto ? editandoProducto.nombre : nuevoProducto.nombre}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="descripcion">Descripción:</label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={editandoProducto ? editandoProducto.descripcion : nuevoProducto.descripcion}
                        onChange={handleChange}
                    ></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="precio">Precio (S/):</label>
                    <input
                        type="number"
                        id="precio"
                        name="precio"
                        value={editandoProducto ? editandoProducto.precio : nuevoProducto.precio}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="stock">Stock:</label>
                    <input
                        type="number"
                        id="stock"
                        name="stock"
                        value={editandoProducto ? editandoProducto.stock : nuevoProducto.stock}
                        onChange={handleChange}
                        min="0"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="imagen_url">Nombre de archivo de Imagen (ej. camiseta.jpg):</label>
                    <input
                        type="text"
                        id="imagen_url"
                        name="imagen_url"
                        value={editandoProducto ? editandoProducto.imagen_url : nuevoProducto.imagen_url}
                        onChange={handleChange}
                        placeholder="ej. mi_producto.png"
                    />
                    {editandoProducto && editandoProducto.imagen_url && (
                        <p className="current-image-preview">
                            Imagen actual:
                            <img
                                src={getImageUrl(editandoProducto.imagen_url)}
                                alt="Vista previa"
                                className="product-thumbnail-preview"
                            />
                            <span>{editandoProducto.imagen_url}</span>
                        </p>
                    )}
                </div>
                <br />
                <button type="submit">{editandoProducto ? 'Actualizar Producto' : 'Añadir Producto'}</button>
                {editandoProducto && (
                    <button type="button" onClick={() => setEditandoProducto(null)} className="cancel-button">
                        Cancelar Edición
                    </button>
                )}
            </form>

            <div className="product-list-section">
                <h3>Productos en Inventario</h3>
                {productos.length > 0 ? (
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Imagen</th>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Precio (S/)</th>
                                <th>Stock Actual</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map((product) => (
                                <tr key={product.id_prod}>
                                    <td>{product.id_prod}</td>
                                    <td>
                                        <img
                                            src={getImageUrl(product.imagen_url)}
                                            alt={product.nombre}
                                            className="product-thumbnail"
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }}
                                        />
                                    </td>
                                    <td>{product.nombre}</td>
                                    <td>{product.descripcion}</td>
                                    <td>{parseFloat(product.precio).toFixed(2)}</td>
                                    <td>{product.stock_actual}</td>
                                    <td>
                                        <button onClick={() => handleEditClick(product)} className="edit-button">
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No hay productos en el inventario.</p>
                )}
            </div>
        </div>
    );
}

export default ControlInventario;