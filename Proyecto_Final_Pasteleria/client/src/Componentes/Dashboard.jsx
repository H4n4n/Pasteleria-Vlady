import React, { useState } from 'react';
import VentaSection from './VentaSection';
import HistorialVentasSection from './HistorialVentasSection'; 
import InventarioSection from './InventarioSection'; 
import ReportesSection from './ReportesSection';     
import './Dashboard.css'; 

function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('inicio');

  const renderSection = () => {
    switch (activeSection) {
      case 'inicio':
        return (
          <div className="page-content welcome-section">
            <h2 className="welcome-title">Bienvenidos a Pastelería Vlady 🧁</h2>
            <img src="images/imgnosotros.jpg" alt="Exhibición de Pasteles" className="welcome-image" />
            <p className="welcome-text">Donde cada dulce tiene una historia que contar.</p>
            <p className="welcome-paragraph">En Pastelería Vlady nos dedicamos a endulzar tus momentos especiales con productos artesanales de la más alta calidad. Cada uno de nuestros postres es elaborado con ingredientes frescos y cuidadosamente seleccionados.</p>
            <p className="welcome-paragraph">Combinamos recetas tradicionales con un toque innovador que deleita a todos los paladares. Desde tortas personalizadas hasta dulces únicos, estamos aquí para acompañarte en cada ocasión importante.</p>
            <p className="welcome-paragraph">Nuestro equipo está comprometido con brindar un servicio excepcional, una amplia variedad de sabores y una experiencia cálida y cercana. Ya sea un cumpleaños, una boda o un antojo repentino, en Vlady encuentras ese toque dulce que necesitas.</p>
            <p className="welcome-thankyou">Gracias por confiar en nosotros. ¡Seguiremos trabajando con pasión y creatividad para formar parte de tus mejores recuerdos!</p>
          </div>
        );
      case 'venta':
        return <VentaSection />;
      case 'historial':
        return <HistorialVentasSection />;
      case 'inventario':
        return <InventarioSection />;
      case 'reportes':
        return <ReportesSection />;
      default:
        return (
          <div className="page-content">
            <h2>Sección no encontrada</h2>
            <p>Por favor, selecciona una opción del menú.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Menú Principal</h2>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => setActiveSection('inicio')} className={activeSection === 'inicio' ? 'active' : ''}>
            Inicio
          </button>
          <button onClick={() => setActiveSection('venta')} className={activeSection === 'venta' ? 'active' : ''}>
            Generar Venta
          </button>
          <button onClick={() => setActiveSection('historial')} className={activeSection === 'historial' ? 'active' : ''}>
            Historial de Pedidos
          </button>
          <button onClick={() => setActiveSection('inventario')} className={activeSection === 'inventario' ? 'active' : ''}>
            Control de Inventario
          </button>
          <button onClick={() => setActiveSection('reportes')} className={activeSection === 'reportes' ? 'active' : ''}>
            Reportes de Venta
          </button>
        </nav>
        <div className="sidebar-footer">
          <button onClick={onLogout} className="logout-button">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-content-header">
          <h1>Pastelería Vlady - Sistema de Gestión</h1>
        </header>
        <div className="page-wrapper">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;