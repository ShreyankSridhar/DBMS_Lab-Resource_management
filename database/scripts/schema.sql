-- ==============================================================================
-- UNIVERSITY LAB RESOURCES ALLOCATION SYSTEM
-- Database: university_lab_db
-- Relational DBMS: MySQL 8.0+
-- Level 3 Academic Project Schema
-- ==============================================================================

DROP DATABASE IF EXISTS university_lab_db;
CREATE DATABASE university_lab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE university_lab_db;

-- ------------------------------------------------------------------------------
-- Table 1: users
-- Stores authentication, role-based authorization, and institutional department.
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'FACULTY', 'ADMIN', 'LAB_MANAGER') NOT NULL DEFAULT 'STUDENT',
    department VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@__%.__%')
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 2: labs
-- Represents laboratory rooms, physical buildings, locations, and seat capacities.
-- ------------------------------------------------------------------------------
CREATE TABLE labs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    description TEXT NULL,
    status ENUM('AVAILABLE', 'MAINTENANCE', 'RESERVED', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_labs_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 3: resource_categories
-- Classification taxonomy for lab equipment (Computers, Oscilloscopes, GPUs, etc.)
-- ------------------------------------------------------------------------------
CREATE TABLE resource_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 4: resources
-- Physical and digital assets assigned to a specific lab with inventory counts.
-- ------------------------------------------------------------------------------
CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    total_quantity INT NOT NULL DEFAULT 1,
    status ENUM('AVAILABLE', 'MAINTENANCE', 'DECOMMISSIONED') NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_resources_qty CHECK (total_quantity >= 0),
    CONSTRAINT fk_resources_lab FOREIGN KEY (lab_id) REFERENCES labs (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_resources_category FOREIGN KEY (category_id) REFERENCES resource_categories (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 5: bookings
-- Core transactional entity recording reservation requests for labs and time slots.
-- ------------------------------------------------------------------------------
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lab_id INT NOT NULL,
    purpose TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_times CHECK (end_time > start_time),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_bookings_lab FOREIGN KEY (lab_id) REFERENCES labs (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 6: booking_items
-- Associative entity mapping specific equipment items and requested quantities.
-- ------------------------------------------------------------------------------
CREATE TABLE booking_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    resource_id INT NOT NULL,
    quantity_requested INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_booking_items_qty CHECK (quantity_requested > 0),
    CONSTRAINT fk_booking_items_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_booking_items_resource FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 7: approvals
-- Administrative decision trail recording approvals, rejections, and comments.
-- ------------------------------------------------------------------------------
CREATE TABLE approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    admin_id INT NOT NULL,
    decision ENUM('APPROVED', 'REJECTED') NOT NULL,
    comments TEXT NULL,
    decided_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_approvals_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_approvals_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 8: maintenance
-- Out-of-service maintenance windows for entire labs or individual equipment.
-- ------------------------------------------------------------------------------
CREATE TABLE maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NULL,
    lab_id INT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    description TEXT NOT NULL,
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_maintenance_times CHECK (end_time > start_time),
    CONSTRAINT chk_maintenance_target CHECK (resource_id IS NOT NULL OR lab_id IS NOT NULL),
    CONSTRAINT fk_maintenance_resource FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_maintenance_lab FOREIGN KEY (lab_id) REFERENCES labs (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_maintenance_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 9: notifications
-- In-app alert messages sent to students/faculty upon approvals, rejections, etc.
-- ------------------------------------------------------------------------------
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type ENUM('BOOKING_REQUEST', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'MAINTENANCE_ALERT', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 10: outbox_events
-- Transactional Outbox pattern: atomicity bridge between MySQL and MongoDB.
-- ------------------------------------------------------------------------------
CREATE TABLE outbox_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload LONGTEXT NOT NULL,
    status ENUM('PENDING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- Table 11: audit_logs (Relational audit mirror)
-- Secondary relational audit trail for immediate local SQL verification.
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
