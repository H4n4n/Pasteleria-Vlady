-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 03-07-2025 a las 22:15:21
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `vladydb`
--
CREATE DATABASE IF NOT EXISTS `vladydb` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `vladydb`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cliente`
--

CREATE TABLE `cliente` (
  `id_cliente` INT(11) NOT NULL AUTO_INCREMENT,
  `DNI` VARCHAR(20) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_venta`
--

CREATE TABLE `detalle_venta` (
  `id_detalle_venta` INT(11) NOT NULL AUTO_INCREMENT,
  `id_venta` INT(11) NOT NULL,
  `id_prod` INT(11) NOT NULL,
  `cantidad` INT(11) NOT NULL,
  `precio_unidad` DECIMAL(10,2) NOT NULL,
  `subTotal` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id_detalle_venta`),
  KEY `id_venta` (`id_venta`),
  KEY `id_prod` (`id_prod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto`
--

CREATE TABLE `producto` (
  `id_prod` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `precio` DECIMAL(10,2) NOT NULL,
  `stock_inicial` INT(11) NOT NULL,
  `stock_actual` INT(11) NOT NULL,
  PRIMARY KEY (`id_prod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` INT(11) NOT NULL AUTO_INCREMENT,
  `dni` VARCHAR(20) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  `telefono` VARCHAR(20) DEFAULT NULL,
  `correo` VARCHAR(100) NOT NULL UNIQUE,
  `contra` VARCHAR(255) NOT NULL, -- Para almacenar hashes de bcrypt
  `rol` VARCHAR(50) NOT NULL DEFAULT 'cliente', -- ¡Esta es la línea clave!
  PRIMARY KEY (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta`
--

CREATE TABLE `venta` (
  `id_venta` INT(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` INT(11) NOT NULL, -- Referencia al usuario que realizó la venta
  `id_cliente` INT(11) NOT NULL,
  `fecha` DATETIME NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `metodo_pago` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_venta`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_cliente` (`id_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--

-- Añadir una columna para marcar el producto como "eliminado lógicamente"
ALTER TABLE producto ADD COLUMN estado ENUM('activo', 'inactivo') DEFAULT 'activo';

-- Opcional: Crear una tabla de log para registros eliminados (auditoría)
CREATE TABLE productos_eliminados_log (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    id_prod_original INT,
    nombre_original VARCHAR(255),
    descripcion_original TEXT,
    precio_original DECIMAL(10, 2),
    stock_actual_original INT,
    eliminado_por_usuario_id INT,
    fecha_eliminacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    razon_eliminacion VARCHAR(255),
    FOREIGN KEY (eliminado_por_usuario_id) REFERENCES usuario(id_usuario)
);

-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD CONSTRAINT `fk_detalleventa_producto` FOREIGN KEY (`id_prod`) REFERENCES `producto` (`id_prod`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_detalleventa_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `venta`
--
ALTER TABLE `venta`
  ADD CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_venta_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;