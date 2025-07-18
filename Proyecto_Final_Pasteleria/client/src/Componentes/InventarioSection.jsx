import React, { useState, useEffect } from 'react';
import './InventarioSection.css';

function InventarioSection() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [newProduct, setNewProduct] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        stock: ''
    });
    const [editingProduct, setEditingProduct] = useState(null);

    const fetchProductos = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/productos');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                setProductos(data.data);
            } else {
                setError(data.message || 'No se pudieron cargar los productos del inventario.');
            }
        } catch (err) {
            console.error('Error al cargar los productos del inventario:', err);
            setError('Error de conexión con el servidor. Intenta de nuevo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductos();
    }, []);

    const handleNewProductChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddProductSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!newProduct.nombre || !newProduct.precio || !newProduct.stock) {
            setMessage('Por favor, completa todos los campos obligatorios para el producto.');
            return;
        }

        let url = 'http://localhost:3000/api/productos';
        let method = 'POST';
        let successMessage = 'Producto añadido exitosamente!';
        let errorMessage = 'Error al añadir el producto.';

        if (editingProduct) {
            url = `http://localhost:3000/api/productos/${editingProduct.id_prod}`;
            method = 'PUT';
            successMessage = 'Producto actualizado exitosamente!';
            errorMessage = 'Error al actualizar el producto.';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newProduct),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setMessage(successMessage);
                setNewProduct({
                    nombre: '',
                    descripcion: '',
                    precio: '',
                    stock: ''
                });
                setEditingProduct(null);
                fetchProductos();
            } else {
                setMessage(data.message || errorMessage);
            }
        } catch (err) {
            console.error(errorMessage, err);
            setMessage('Error de conexión con el servidor. Intenta de nuevo más tarde.');
        }
    };

    const handleEditClick = (producto) => {
        setEditingProduct(producto);
        setNewProduct({
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            precio: producto.precio,
            stock: producto.stock_actual
        });
        setMessage('');
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setNewProduct({
            nombre: '',
            descripcion: '',
            precio: '',
            stock: ''
        });
        setMessage('');
    };
    const handleDeleteProduct = async (id_prod, nombreProducto) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el producto "${nombreProducto}"?`)) {
            try {
                const response = await fetch(`http://localhost:3000/api/productos/${id_prod}`, {
                    method: 'DELETE',
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    setMessage(`Producto "${nombreProducto}" eliminado exitosamente.`);
                    fetchProductos();
                } else {
                    setMessage(data.message || `Error al eliminar el producto "${nombreProducto}".`);
                }
            } catch (err) {
                console.error('Error al eliminar el producto:', err);
                setMessage('Error de conexión con el servidor al intentar eliminar el producto.');
            }
        }
    };

    const getProductImage = (nombreProducto) => {
        const normalizedName = nombreProducto
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[ñáéíóúü]/g, (char) => {
                switch (char) {
                    case 'ñ': return 'n'; case 'á': return 'a'; case 'é': return 'e'; case 'í': return 'i'; case 'ó': return 'o'; case 'ú': return 'u'; case 'ü': return 'u';
                    default: return char;
                }
            });
        return `/images/productos/${normalizedName}.jpg`;
    };

    if (loading) {
        return (
            <div className="page-content inventario-section">
                <h2>Control de Inventario</h2>
                <p>Cargando productos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-content inventario-section error-message">
                <h2>Control de Inventario</h2>
                <p>Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="page-content inventario-section">
            <h2>Control de Inventario</h2>

            <section className="add-product-section">
                <h3>{editingProduct ? 'Modificar Producto' : 'Adicionar Nuevo Producto'}</h3>
                <form onSubmit={handleAddProductSubmit} className="add-product-form">
                    <div className="form-group">
                        <label htmlFor="nombre">Nombre:</label>
                        <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            value={newProduct.nombre}
                            onChange={handleNewProductChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="descripcion">Descripción:</label>
                        <textarea
                            id="descripcion"
                            name="descripcion"
                            value={newProduct.descripcion}
                            onChange={handleNewProductChange}
                            rows="3"
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="precio">Precio (S/.):</label>
                        <input
                            type="number"
                            id="precio"
                            name="precio"
                            value={newProduct.precio}
                            onChange={handleNewProductChange}
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="stock">Stock Inicial:</label>
                        <input
                            type="number"
                            id="stock"
                            name="stock"
                            value={newProduct.stock}
                            onChange={handleNewProductChange}
                            min="0"
                            required
                        />
                    </div>
                    <button type="submit" className="submit-button">
                        {editingProduct ? 'Actualizar Producto' : 'Añadir Producto'}
                    </button>
                    {editingProduct && (
                        <button type="button" onClick={handleCancelEdit} className="cancel-button">
                            Cancelar Edición
                        </button>
                    )}
                    {message && <p className="form-message">{message}</p>}
                </form>
            </section>

            <hr className="section-divider" />

            {productos.length > 0 ? (
                <div className="product-cards-container">
                    {productos.map((producto) => (
                        <div key={producto.id_prod} className="product-card">
                            <img
                                src={getProductImage(producto.nombre)}
                                alt={producto.nombre}
                                className="product-image"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.jpg';
                                }}
                            />
                            <h3 className="product-name">{producto.nombre}</h3>
                            <p className="product-price">Precio: S/. {parseFloat(producto.precio).toFixed(2)}</p>
                            <p className="product-stock-initial">Stock Inicial: {producto.stock_inicial} unidades</p>
                            <p className="product-stock-actual">Stock Actual: {producto.stock_actual} unidades</p>
                            <div className="product-actions"> 
                                <button
                                    onClick={() => handleEditClick(producto)}
                                    className="edit-button"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteProduct(producto.id_prod, producto.nombre)}
                                    className="delete-button" 
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-products-message">No hay productos registrados en el inventario.</p>
            )}
        </div>
    );
}

export default InventarioSection;