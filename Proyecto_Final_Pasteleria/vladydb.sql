CREATE DATABASE IF NOT EXISTS vladydb;
USE vladydb;


CREATE TABLE cliente (
    id_cliente INT(11) PRIMARY KEY AUTO_INCREMENT,
    DNI VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE usuario (
    id_usuario INT(11) PRIMARY KEY AUTO_INCREMENT,
    DNI INT(11) UNIQUE NOT NULL,
    telefono INT(11),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contra VARCHAR(50) NOT NULL 
);

CREATE TABLE venta (
    id_venta INT(11) PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT(11) NOT NULL,
    id_cliente INT(11) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    total FLOAT NOT NULL,
    metodo_pago VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

CREATE TABLE producto (
    id_prod INT(11) PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio FLOAT NOT NULL,
    stock_inicial INT(11) NOT NULL,
    stock_actual INT(11) NOT NULL
);

CREATE TABLE detalle_venta (
    id_detalle INT(11) PRIMARY KEY AUTO_INCREMENT,
    id_venta INT(11) NOT NULL,
    id_prod INT(11) NOT NULL,
    cantidad INT(11) NOT NULL,
    precio_unidad FLOAT NOT NULL,
    subTotal FLOAT NOT NULL,
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
    FOREIGN KEY (id_prod) REFERENCES producto(id_prod)
);