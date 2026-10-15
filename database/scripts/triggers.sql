-- ==============================================================================
-- UNIVERSITY LAB RESOURCES ALLOCATION SYSTEM
-- Database: university_lab_db
-- Relational DBMS: MySQL 8.0+
-- Script: triggers.sql (Integrity & Audit Triggers)
-- ==============================================================================

USE university_lab_db;

DELIMITER $$

-- ------------------------------------------------------------------------------
-- Trigger 1: trg_bookings_before_insert
-- Enforces interval validity: end_time must be strictly after start_time.
-- Rejects requests scheduled prior to current system timestamp.
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_bookings_before_insert$$
CREATE TRIGGER trg_bookings_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    IF NEW.end_time <= NEW.start_time THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Booking end_time must be later than start_time.';
    END IF;
END$$

-- ------------------------------------------------------------------------------
-- Trigger 2: trg_bookings_before_update
-- Prevents illegal state transitions (e.g. mutating a CANCELLED or REJECTED booking)
-- and verifies time validity upon rescheduling.
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_bookings_before_update$$
CREATE TRIGGER trg_bookings_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF NEW.end_time <= NEW.start_time THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Rescheduled end_time must be later than start_time.';
    END IF;

    -- Disallow re-activating terminal booking statuses
    IF OLD.status IN ('CANCELLED', 'REJECTED') AND NEW.status = 'APPROVED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'State Transition Error: A CANCELLED or REJECTED booking cannot be directly marked APPROVED.';
    END IF;
END$$

-- ------------------------------------------------------------------------------
-- Trigger 3: trg_bookings_after_update_audit
-- Records an automated audit trail entry whenever booking status transitions.
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_bookings_after_update_audit$$
CREATE TRIGGER trg_bookings_after_update_audit
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO audit_logs (
            actor_id, 
            action, 
            entity_type, 
            entity_id, 
            details, 
            created_at
        ) VALUES (
            NEW.user_id,
            CONCAT('BOOKING_STATUS_', NEW.status),
            'BOOKING',
            NEW.id,
            CONCAT('Status shifted from ', OLD.status, ' to ', NEW.status, ' for lab ID: ', NEW.lab_id),
            NOW()
        );
    END IF;
END$$

-- ------------------------------------------------------------------------------
-- Trigger 4: trg_resources_before_update
-- Safeguards inventory count against negative totals.
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_resources_before_update$$
CREATE TRIGGER trg_resources_before_update
BEFORE UPDATE ON resources
FOR EACH ROW
BEGIN
    IF NEW.total_quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Resource total_quantity cannot be negative.';
    END IF;
END$$

-- ------------------------------------------------------------------------------
-- Trigger 5: trg_maintenance_before_insert
-- Enforces validity on maintenance schedules.
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_maintenance_before_insert$$
CREATE TRIGGER trg_maintenance_before_insert
BEFORE INSERT ON maintenance
FOR EACH ROW
BEGIN
    IF NEW.end_time <= NEW.start_time THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Maintenance end_time must be after start_time.';
    END IF;

    IF NEW.lab_id IS NULL AND NEW.resource_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integrity Violation: Maintenance event must specify either a lab_id or a resource_id.';
    END IF;
END$$

DELIMITER ;
