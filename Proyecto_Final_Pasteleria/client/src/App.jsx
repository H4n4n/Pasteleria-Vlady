// client/src/App.jsx
import React, { useState } from 'react';
import Dashboard from './Componentes/Dashboard';
import './App.css'; 

function App() {
  const [correo, setCorreo] = useState('');
  const [contra, setContra] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [regDNI, setRegDNI] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regContra, setRegContra] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      // *** CAMBIO AQUÍ: USAR URL COMPLETA ***
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo, contra }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('Inicio de sesión exitoso:', data.message);
        setIsLoggedIn(true);
      } else {
        setErrorMessage(data.message || 'Error desconocido al iniciar sesión.');
      }
    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      setErrorMessage('No se pudo conectar con el servidor. Intenta de nuevo más tarde.');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setRegisterMessage('');

    if (!regDNI || !regNombre || !regApellido || !regTelefono || !regCorreo || !regContra) {
      setRegisterMessage('Por favor, completa todos los campos.');
      return;
    }

    try {
      // *** CAMBIO AQUÍ: USAR URL COMPLETA ***
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dni: regDNI,
          nombre: regNombre,
          apellido: regApellido,
          telefono: regTelefono,
          correo: regCorreo,
          contra: regContra,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRegisterMessage('Usuario registrado con éxito. Ahora puedes iniciar sesión.');
        setRegDNI('');
        setRegNombre('');
        setRegApellido('');
        setRegTelefono('');
        setRegCorreo('');
        setRegContra('');
        setIsRegistering(false);
      } else {
        setRegisterMessage(data.message || 'Error desconocido al registrar usuario.');
      }
    } catch (error) {
      console.error('Error al conectar con el servidor para registro:', error);
      setRegisterMessage('No se pudo conectar con el servidor para registrar el usuario.');
    }
  };


  const handleLogout = () => {
    setIsLoggedIn(false);
    setCorreo('');
    setContra('');
    setErrorMessage('');
    setRegisterMessage('');
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} />; 
  }

  return (
    <div className="login-container">
      <div className="login-card">

        <h1 className="login-title">Vladys</h1>

        {!isRegistering ? (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input
                type="email"
                placeholder="Usuario (Correo)"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Contraseña"
                value={contra}
                onChange={(e) => setContra(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button">Ingresar</button>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <p className="footer-text">Pastelería Vlady &copy; 2025</p>

            <p style={{ marginTop: '15px', fontSize: '0.9em' }}>
              ¿No tienes una cuenta? <span
                onClick={() => {
                  setIsRegistering(true);
                  setErrorMessage('');
                  setCorreo('');
                  setContra('');
                }}
                style={{ color: 'var(--color-base)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Regístrate aquí
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <h2 style={{ color: 'var(--color-base)', marginBottom: '20px', fontSize: '1.5em' }}>Registrar Nuevo Usuario</h2>
            <div className="input-group">
              <input
                type="text"
                placeholder="DNI"
                value={regDNI}
                onChange={(e) => setRegDNI(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                placeholder="Nombre"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                placeholder="Apellido"
                value={regApellido}
                onChange={(e) => setRegApellido(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="tel"
                placeholder="Teléfono"
                value={regTelefono}
                onChange={(e) => setRegTelefono(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={regCorreo}
                onChange={(e) => setRegCorreo(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Contraseña"
                value={regContra}
                onChange={(e) => setRegContra(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button">Registrar</button>
            {registerMessage && <p className="error-message">{registerMessage}</p>}
            <p style={{ marginTop: '15px', fontSize: '0.9em' }}>
              ¿Ya tienes una cuenta? <span
                onClick={() => {
                  setIsRegistering(false);
                  setRegisterMessage('');
                  setRegCorreo('');
                  setRegContra('');
                }}
                style={{ color: 'var(--color-base)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Inicia sesión aquí
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;