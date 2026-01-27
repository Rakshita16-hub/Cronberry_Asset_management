-- Cronberry Assets Tracker Database Schema
-- MySQL Database Schema

CREATE DATABASE IF NOT EXISTS cronberry_assets;
USE cronberry_assets;

-- Users Table (for authentication)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('HR', 'Admin', 'Employee') DEFAULT 'HR',
    employee_id VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_employee_id (employee_id)
);

-- Employees Table
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    date_of_joining DATE NOT NULL,
    status ENUM('Active', 'Exit') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_email (email)
);

-- Assets Table
CREATE TABLE assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    serial_number VARCHAR(255) DEFAULT NULL,
    imei_2 VARCHAR(255) DEFAULT NULL,
    condition_status ENUM('New', 'Good', 'Damaged') DEFAULT 'New',
    status ENUM('Available', 'Assigned', 'Under Repair') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_asset_id (asset_id),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_serial_number (serial_number)
);

-- Assignments Table
CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id VARCHAR(50) UNIQUE NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    asset_id VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    assigned_date DATE NOT NULL,
    return_date DATE DEFAULT NULL,
    asset_return_condition ENUM('Good', 'Damaged', 'Needs Repair') DEFAULT NULL,
    remarks TEXT DEFAULT NULL,
    sim_provider VARCHAR(50) DEFAULT NULL,
    sim_mobile_number VARCHAR(20) DEFAULT NULL,
    sim_type VARCHAR(50) DEFAULT NULL,
    sim_ownership VARCHAR(50) DEFAULT NULL,
    sim_purpose TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_employee_id (employee_id),
    INDEX idx_asset_id (asset_id),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);

-- SIM Connections Table (Independent Master Table)
CREATE TABLE sim_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sim_mobile_number VARCHAR(20) UNIQUE NOT NULL,
    current_owner_name VARCHAR(255) NOT NULL,
    connection_status ENUM('Active', 'Inactive') DEFAULT 'Active',
    sim_status ENUM('Assigned', 'In Stock') DEFAULT 'In Stock',
    remarks TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sim_mobile_number (sim_mobile_number),
    INDEX idx_connection_status (connection_status),
    INDEX idx_sim_status (sim_status)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, role) VALUES 
('admin', '$2a$10$XqN8Y8CqvVZhqKGvEJv0JuZYmF7pV7nXqPLHZZ0KY7BvYZx8.lQ8K', 'HR');

-- Sample data for testing
INSERT INTO employees (employee_id, full_name, department, designation, email, date_of_joining, status) VALUES
('EMP0001', 'Test Employee UI', 'IT', 'Software Engineer', 'test@example.com', '2024-01-15', 'Active');

INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, condition_status, status) VALUES
('AST0001', 'Dell Laptop', 'Electronics', 'Dell', 'DL123456', 'New', 'Available'),
('AST0002', 'iPhone 15', 'Mobile', 'Apple', '123456789012345', 'New', 'Available');

INSERT INTO sim_connections (sim_mobile_number, current_owner_name, connection_status, sim_status, remarks) VALUES
('9876543210', 'Office', 'Active', 'In Stock', 'Available for new employee');