-- Cronberry Assets Tracker Database Schema
-- PostgreSQL Database Schema

-- NOTE:
-- Create the database separately, for example:
--   createdb cronberry_assets
-- Then connect to it and run this file.

-- Users Table (for authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role TEXT NOT NULL DEFAULT 'HR' CHECK (role IN ('HR', 'Admin', 'Employee')),
    employee_id VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_username ON users (username);
CREATE INDEX idx_employee_id ON users (employee_id);

-- Employees Table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    date_of_joining DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Exit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employee_id ON employees (employee_id);
CREATE INDEX idx_status ON employees (status);
CREATE INDEX idx_email ON employees (email);

-- Assets Table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    serial_number VARCHAR(255) DEFAULT NULL,
    imei_2 VARCHAR(255) DEFAULT NULL,
    condition_status TEXT NOT NULL DEFAULT 'New' CHECK (condition_status IN ('New', 'Good', 'Damaged')),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Assigned', 'Under Repair')),
    remarks TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_asset_id ON assets (asset_id);
CREATE INDEX idx_category ON assets (category);
CREATE INDEX idx_status ON assets (status);
CREATE INDEX idx_serial_number ON assets (serial_number);

-- Assignments Table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    assignment_id VARCHAR(50) UNIQUE NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    asset_id VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    assigned_date DATE NOT NULL,
    return_date DATE DEFAULT NULL,
    asset_return_condition TEXT DEFAULT NULL CHECK (
      asset_return_condition IS NULL
      OR asset_return_condition IN ('Good', 'Damaged', 'Needs Repair')
    ),
    remarks TEXT DEFAULT NULL,
    sim_provider VARCHAR(50) DEFAULT NULL,
    sim_mobile_number VARCHAR(20) DEFAULT NULL,
    sim_type VARCHAR(50) DEFAULT NULL,
    sim_ownership VARCHAR(50) DEFAULT NULL,
    sim_purpose TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_assignments_employee
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_asset
      FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);

CREATE INDEX idx_assignment_id ON assignments (assignment_id);
CREATE INDEX idx_employee_id_assignments ON assignments (employee_id);
CREATE INDEX idx_asset_id_assignments ON assignments (asset_id);

-- SIM Connections Table (Independent Master Table)
CREATE TABLE sim_connections (
    id SERIAL PRIMARY KEY,
    sim_mobile_number VARCHAR(20) UNIQUE NOT NULL,
    current_owner_name VARCHAR(255) NOT NULL,
    connection_status TEXT NOT NULL DEFAULT 'Active' CHECK (connection_status IN ('Active', 'Inactive')),
    sim_status TEXT NOT NULL DEFAULT 'In Stock' CHECK (sim_status IN ('Assigned', 'In Stock')),
    remarks TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sim_mobile_number ON sim_connections (sim_mobile_number);
CREATE INDEX idx_connection_status ON sim_connections (connection_status);
CREATE INDEX idx_sim_status ON sim_connections (sim_status);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, role) VALUES 
('admin', '$2a$10$$2a$10$3B9EHdHZt4zyew0XO5bHQu8VX1HmNb.BvlTbqBc7khR8UKdzIArDS.lQ8K', 'Admin');

-- Insert HR user (username: hr@cronberry.com, password: Cron@2026, role: HR)
INSERT INTO users (username, password, role) VALUES 
('hr@cronberry.com', '$2a$10$kFxFxQR5tYKSUvT32LJCcugytFHkDw7iKui7pX5eEwuqLdv4XWoNC', 'HR');

-- Sample data for testing
INSERT INTO employees (employee_id, full_name, department, designation, email, date_of_joining, status) VALUES
('EMP0001', 'Test Employee UI', 'IT', 'Software Engineer', 'test@example.com', '2024-01-15', 'Active');

INSERT INTO assets (asset_id, asset_name, category, brand, serial_number, condition_status, status) VALUES
('AST0001', 'Dell Laptop', 'Electronics', 'Dell', 'DL123456', 'New', 'Available'),
('AST0002', 'iPhone 15', 'Mobile', 'Apple', '123456789012345', 'New', 'Available');

INSERT INTO sim_connections (sim_mobile_number, current_owner_name, connection_status, sim_status, remarks) VALUES
('9876543210', 'Office', 'Active', 'In Stock', 'Available for new employee');